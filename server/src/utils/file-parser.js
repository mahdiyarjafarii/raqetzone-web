import * as chardet from 'chardet'
import { execFile } from 'child_process'
import Epub from 'epub'
import fs from 'fs-extra'
import iconv from 'iconv-lite'
import officeParser from 'officeparser'
import { promisify } from 'util'

import { isEpubFilePath, isLegacyDocFilePath, isOfficeFilePath } from '../shared/file-extensions.js'

const execFileAsync = promisify(execFile)

// Helper function to decode HTML entities
function decodeHtmlEntities(text) {
  // Handle hexadecimal entities like &#x6b64;
  text = text.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16))
    } catch (e) {
      return match // Return original if conversion fails
    }
  })

  // Handle decimal entities like &#123;
  text = text.replace(/&#(\d+);/g, (match, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10))
    } catch (e) {
      return match // Return original if conversion fails
    }
  })

  // Handle named entities
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

// Simple concurrent map implementation using native Promise.allSettled
async function concurrentMap(
  items,
  mapper,
  concurrency = 8
) {
  const results = []

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchNumber = Math.floor(i / concurrency) + 1
    const totalBatches = Math.ceil(items.length / concurrency)

    console.debug(`Processing batch ${batchNumber}/${totalBatches} with ${batch.length} items`)

    const batchResults = await Promise.allSettled(batch.map((item, batchIndex) => mapper(item, i + batchIndex)))

    // Extract successful results
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      }
    }
  }

  return results
}

// Parse legacy .doc files using textutil (macOS) or antiword (Linux/cross-platform)
async function parseLegacyDoc(filePath) {
  const platform = process.platform
  
  try {
    if (platform === 'darwin') {
      // macOS - use built-in textutil
      const tempTxtFile = `${filePath}.txt`
      
      try {
        await execFileAsync('textutil', ['-convert', 'txt', '-output', tempTxtFile, filePath])
        const text = await fs.readFile(tempTxtFile, 'utf8')
        await fs.remove(tempTxtFile) // Clean up temp file
        return text
      } catch (error) {
        // Clean up temp file if it exists
        if (await fs.pathExists(tempTxtFile)) {
          await fs.remove(tempTxtFile)
        }
        throw error
      }
    } else {
      // Linux/Unix - try antiword
      try {
        const { stdout } = await execFileAsync('antiword', [filePath])
        return stdout
      } catch (error) {
        throw new Error(
          'antiword is not installed. Please install it: sudo apt-get install antiword (Ubuntu/Debian) or yum install antiword (RedHat/CentOS)'
        )
      }
    }
  } catch (error) {
    console.error('Legacy .doc parsing error:', error)
    throw new Error(`Failed to parse .doc file: ${error.message}`)
  }
}

export async function parseFile(filePath) {
  // Handle legacy .doc files separately
  if (isLegacyDocFilePath(filePath)) {
    try {
      const data = await parseLegacyDoc(filePath)
      return data
    } catch (error) {
      console.error('Legacy .doc parsing error:', error)
      throw error
    }
  }

  if (isOfficeFilePath(filePath)) {
    try {
      const data = await officeParser.parseOfficeAsync(filePath, {
        outputErrorToConsole: true,
        newlineDelimiter: '\n',
        ignoreNotes: false,
        putNotesAtLast: false
      })
      return data
    } catch (error) {
      console.error('Office file parsing error:', error)
      throw error
    }
  }

  if (isEpubFilePath(filePath)) {
    try {
      const data = await parseEpub(filePath)
      return data
    } catch (error) {
      console.error('EPUB parsing error:', error)
      throw error
    }
  }

  // Read first 4KB for encoding detection to avoid memory issues with large files
  const stats = await fs.stat(filePath)
  const sampleSize = Math.min(4096, stats.size)

  // Read sample buffer from file using fs-extra's readFile with options
  const sampleBuffer = await fs.readFile(filePath, { 
    encoding: null,
    flag: 'r'
  }).then(buffer => buffer.slice(0, sampleSize))

  // Detect encoding from sample
  const detectedEncoding = chardet.detect(sampleBuffer)
  const encoding = detectedEncoding || 'utf8'

  console.debug(`Detected encoding for ${filePath}: ${encoding}`)

  // Read full file as buffer and convert with detected encoding
  const fileBuffer = await fs.readFile(filePath)
  const data = iconv.decode(fileBuffer, encoding)
  return data
}

export async function parseEpub(filePath) {
  return new Promise((resolve, reject) => {
    const epub = new Epub(filePath)

    epub.on('error', (error) => {
      console.error('EPUB parsing error:', error)
      reject(error)
    })

    epub.on('end', async () => {
      try {
        const metadata = epub.metadata
        console.info('EPUB metadata:', {
          title: metadata.title,
          creator: metadata.creator,
          language: metadata.language,
          chapters: epub.flow.length,
        })

        // Helper function to process a single chapter
        const processChapter = async (chapter) => {
          try {
            const chapterText = await new Promise((resolveChapter, rejectChapter) => {
              epub.getChapter(chapter.id, (error, text) => {
                if (error) {
                  console.error(`Error reading chapter ${chapter.id}:`, error)
                  rejectChapter(error)
                } else {
                  resolveChapter(text || '')
                }
              })
            })

            // Remove HTML tags and extract plain text
            let plainText = chapterText.replace(/<[^>]*>/g, '') // Remove HTML tags

            // Decode HTML entities (including hex)
            plainText = decodeHtmlEntities(plainText)
              .replace(/\s+/g, ' ') // Replace multiple whitespaces with single space
              .trim()

            return plainText || null
          } catch (chapterError) {
            console.warn(`Failed to read chapter ${chapter.id}, skipping:`, chapterError)
            return null // Return null for failed chapters to continue processing
          }
        }

        // Extract text from all chapters using concurrent processing
        console.info(`Starting concurrent processing of ${epub.flow.length} chapters with concurrency: 8`)

        const chapterResults = await concurrentMap(epub.flow, processChapter, 8)
        const chapterTexts = chapterResults.filter((text) => text !== null)
        console.info(`Successfully processed ${chapterTexts.length}/${epub.flow.length} chapters`)

        const fullText = chapterTexts.join('\n\n')

        if (!fullText) {
          throw new Error('No readable text content found in EPUB file')
        }

        console.info(`Successfully extracted ${fullText.length} characters from ${chapterTexts.length} chapters`)
        resolve(fullText)
      } catch (error) {
        console.error('Error extracting EPUB content:', error)
        reject(error)
      }
    })

    epub.parse()
  })
}

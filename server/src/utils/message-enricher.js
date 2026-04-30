import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

import { parseFile } from './file-parser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Enriches messages with file content from attachments
 * @param {Array} messages - Array of message objects with structure: { from, content, attachments }
 * @returns {Promise<Array>} - Enriched messages with file content merged into content
 */
export async function enrichMessagesWithFileContent(messages) {
  const enrichedMessages = []

  for (const msg of messages) {
    // Clone the message to avoid mutating the original
    let enrichedMsg = { ...msg }

    // Only process messages with file attachments
    if (msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0) {
      const fileAttachments = msg.attachments.filter((att) => att.type === 'file')

      if (fileAttachments.length > 0) {
        // Process each file attachment
        for (const [fileIndex, file] of fileAttachments.entries()) {
          try {
            // Convert URL to local file path
            const filePath = urlToLocalPath(file.url)

            // Check if file exists
            if (!(await fs.pathExists(filePath))) {
              console.warn(`File not found: ${filePath}`)
              continue
            }

            // Parse file content
            const content = await parseFile(filePath)

            // Format as XML-like structure
            let attachment = '\n\n<ATTACHMENT_FILE>\n'
            attachment += `<FILE_INDEX>File ${fileIndex + 1}</FILE_INDEX>\n`
            attachment += `<FILE_NAME>${file.name}</FILE_NAME>\n`
            attachment += '<FILE_CONTENT>\n'
            attachment += `${content}\n`
            attachment += '</FILE_CONTENT>\n'
            attachment += '</ATTACHMENT_FILE>\n'

            // Merge with message content
            enrichedMsg.content = (enrichedMsg.content || '') + attachment
          } catch (error) {
            console.error(`Error parsing file ${file.name}:`, error)
            // Add error notice to message instead of failing completely
            const errorNotice = `\n\n<ATTACHMENT_FILE>\n<FILE_INDEX>File ${fileIndex + 1}</FILE_INDEX>\n<FILE_NAME>${file.name}</FILE_NAME>\n<FILE_CONTENT>\n[Error: Unable to parse file - ${error.message}]\n</FILE_CONTENT>\n</ATTACHMENT_FILE>\n`
            enrichedMsg.content = (enrichedMsg.content || '') + errorNotice
          }
        }
      }
    }

    enrichedMessages.push(enrichedMsg)
  }

  return enrichedMessages
}

/**
 * Converts a URL to a local file path
 * @param {string} url - The file URL (e.g., http://localhost:3000/uploads/attachment/2024-01-01/file.pdf)
 * @returns {string} - Local file path
 */
function urlToLocalPath(url) {
  try {
    // If it's already a local path, return it
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return url
    }

    // Parse URL and extract the path after /uploads/
    const urlObj = new URL(url)
    const urlPath = urlObj.pathname

    // Extract the relative path from /uploads/...
    const uploadsMatch = urlPath.match(/\/uploads\/(.+)/)
    if (!uploadsMatch) {
      throw new Error(`Invalid URL format: ${url}`)
    }

    const relativePath = uploadsMatch[1]

    // Build absolute path to file
    const absolutePath = path.join(__dirname, '../../public/uploads', relativePath)

    return absolutePath
  } catch (error) {
    console.error('Error converting URL to local path:', error)
    throw error
  }
}

/**
 * Enriches a single message with file content
 * @param {Object} message - Message object with structure: { from, content, attachments }
 * @returns {Promise<Object>} - Enriched message with file content merged into content
 */
export async function enrichMessageWithFileContent(message) {
  const [enrichedMessage] = await enrichMessagesWithFileContent([message])
  return enrichedMessage
}


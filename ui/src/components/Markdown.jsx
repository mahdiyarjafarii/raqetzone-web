import { useEffect, useMemo, useRef, useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { BsClipboard } from "react-icons/bs";
import ReactMarkdown from "react-markdown";
import reactNodeToString from "react-node-to-string";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import supersub from "remark-supersub";
import rehypeRaw from "rehype-raw";

import { CustomTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

// Custom Think Block Component
const ThinkBlock = ({ children }) => {
  return (
    <div className="my-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-l-4 border-primary rounded-r">
      <div className="flex items-center mb-2">
        <div className="w-4 h-4 rounded-full bg-primary mr-2"></div>
        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
          Thinking
        </span>
      </div>
      <div className="text-gray-700 dark:text-gray-300 text-xs whitespace-break-spaces">
        {children.trim()}
      </div>
    </div>
  );
};

// References Block Component for displaying citations
const ReferencesBlock = ({ children }) => {
  const [copiedIdx, setCopiedIdx] = useState(null);
  const text = typeof children === "string" ? children : "";

  // Parse references from text
  const parseReferences = (text) => {
    const lines = text.split("\n").filter((line) => line.trim());
    const refs = [];

    for (const line of lines) {
      // Match patterns like [1] https://... or [1]: https://...
      const match = line.match(/^\[(\d+)\]:?\s*(https?:\/\/\S+)/);
      if (match) {
        const [, num, url] = match;
        // Extract domain for display
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname.replace("www.", "");
          const path =
            urlObj.pathname.length > 1
              ? urlObj.pathname.slice(0, 30) +
                (urlObj.pathname.length > 30 ? "..." : "")
              : "";
          refs.push({ num, url, domain, path });
        } catch {
          refs.push({ num, url, domain: url.slice(0, 40), path: "" });
        }
      }
    }
    return refs;
  };

  const handleCopy = async (url, idx) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const references = parseReferences(text);

  if (references.length === 0) return null;

  return (
    <div className="references-block-wrapper my-4 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 font-vazirmatn">
            منابع
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({references.length})
          </span>
        </div>
      </div>

      {/* References List */}
      <div className="p-3 grid gap-2">
        {references.map((ref, idx) => (
          <button
            key={idx}
            onClick={() => handleCopy(ref.url, idx)}
            className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700 w-full text-right"
          >
            {/* Number Badge */}
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-semibold flex items-center justify-center">
              {ref.num}
            </span>

            {/* URL Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${ref.domain}&sz=16`}
                  alt=""
                  className="w-4 h-4 rounded"
                  onError={(e) => (e.target.style.display = "none")}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                  {ref.domain}
                </span>
              </div>
              {ref.path && (
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5 mb-0!">
                  {ref.path}
                </p>
              )}
            </div>

            {/* Copy Icon / Copied Checkmark */}
            {copiedIdx === idx ? (
              <svg
                className="w-4 h-4 text-green-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const preprocessLaTeX = (content) => {
  if (!content) return content;

  // Check if content appears to be code that uses $ characters
  if (
    content.includes("$PSVersionTable") ||
    content.includes("Get-Command") ||
    content.includes("Get-Process") ||
    /\$\w+\s*=/.test(content) ||
    content.includes("```")
  ) {
    // Skip LaTeX processing for code blocks and PowerShell code
    return content;
  }

  // Convert \[ ... \] to $$ ... $$
  content = content.replace(
    /\\\[(.*?)\\\]/gs,
    (_, equation) => `$$${equation}$$`
  );

  // Convert \( ... \) to $ ... $
  content = content.replace(
    /\\\((.*?)\\\)/gs,
    (_, equation) => `$${equation}$`
  );

  // Handle special case where $$ appears after a list item
  content = content.replace(/^(\s*[-*+])\s*\$\$/gm, "$1 $$");

  // Handle any malformed LaTeX delimiters - but only outside of code blocks
  // First, let's split the content into code blocks and non-code blocks
  const parts = [];
  let isCode = false;
  let currentPart = "";

  const lines = content.split("\n");
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      // Save the current part
      parts.push({ isCode, content: currentPart });
      // Switch state
      isCode = !isCode;
      currentPart = line + "\n";
    } else {
      currentPart += line + "\n";
    }
  }

  // Add the last part
  parts.push({ isCode, content: currentPart });

  // Now, apply the LaTeX fixes only to non-code parts
  const processedParts = parts.map((part) => {
    if (part.isCode) {
      return part.content;
    } else {
      // Only apply the LaTeX spacing fixes to non-code parts
      let processedContent = part.content;
      processedContent = processedContent.replace(
        /([^$])\$\$([^$])/g,
        "$1 $$ $2"
      );
      processedContent = processedContent.replace(/([^$])\$([^$])/g, "$1 $ $2");
      return processedContent;
    }
  });

  // Join everything back together
  return processedParts.join("");
};

function CustomCode({ children, className = "", language = "" }) {
  const iframeRef = useRef(null);

  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState("code");
  const code = useMemo(() => reactNodeToString(children), [children]);

  useEffect(() => {
    if (copied) {
      setTimeout(() => setCopied(false), 1000);
    }
  }, [copied]);

  useEffect(() => {
    if (mode == "preview" && iframeRef.current && language == "html") {
      iframeRef.current?.addEventListener("load", () => {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "html",
            code: reactNodeToString(children),
          },
          "*"
        );
      });
    }
  }, [mode, iframeRef.current]);

  if (language === "think") {
    return <ThinkBlock>{children}</ThinkBlock>;
  }

  // Handle references blocks
  if (language === "references") {
    return <ReferencesBlock>{code}</ReferencesBlock>;
  }

  return (
    <div className="flex flex-col my-2">
      <div className="flex flex-row-reverse items-center justify-between bg-[#e6e7e8] dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 text-xs p-2 rounded-t-lg">
        <CopyToClipboard text={code} onCopy={() => setCopied(true)}>
          <div className="flex flex-row items-center gap-2 cursor-pointer w-fit ml-1">
            <span className="font-vazirmatn">
              {copied ? "کپی شد" : "کپی کد"}
            </span>
            <BsClipboard />
          </div>
        </CopyToClipboard>

        {["html", "mermaid"].includes(language) && (
          <div className="flex rounded-full bg-gray-300 dark:bg-zinc-800 p-1 cursor-pointer">
            <div
              className={cn(
                "px-3 py-1 rounded-full",
                mode == "preview" ? "bg-white dark:bg-zinc-900" : ""
              )}
              onClick={() => setMode("preview")}
            >
              <p className="mb-0! font-vazirmatn">نمایش</p>
            </div>

            <div
              className={cn(
                "px-3 py-1 rounded-full",
                mode == "code" ? "bg-white dark:bg-zinc-900" : ""
              )}
              onClick={() => setMode("code")}
            >
              <p className="mb-0! font-vazirmatn">کد</p>
            </div>
          </div>
        )}
      </div>

      {mode == "code" && (
        <code
          className={cn(
            className,
            "bg-white dark:bg-[#0d1117] px-4 w-full h-fit"
          )}
        >
          {children}
        </code>
      )}

      {mode == "preview" && language == "html" && (
        <iframe
          ref={iframeRef}
          className="min-h-[400px] bg-white border border-gray-200"
          src="https://preview.chatplayground.ai/preview"
        ></iframe>
      )}
    </div>
  );
}

const StreamingMarkdown = ({ children }) => {
  const [segments, setSegments] = useState([]);

  useEffect(() => {
    if (!children) return;

    let content = children.toString();
    let currentSegments = [];
    let currentText = "";
    let insideThink = false;
    let thinkContent = "";

    // Transform References section into a special code block
    // Match "References:" followed by numbered links OR just a block of numbered links (3+ references)
    const referencesRegex =
      /(?:\*{0,2}References?:?\*{0,2}\s*\n?)?((?:\[\d+\]:?\s*https?:\/\/[^\s\[\]]+\s*\n?){2,})$/gim;
    content = content.replace(referencesRegex, (match, refs) => {
      return `\n\n\`\`\`references\n${refs.trim()}\n\`\`\`\n\n`;
    });

    // Split content into parts based on think tags
    for (let i = 0; i < content.length; i++) {
      if (content.slice(i, i + 7) === "<think>") {
        // If we have text before the think block, add it as a regular segment
        if (currentText) {
          currentSegments.push({ type: "text", content: currentText });
          currentText = "";
        }
        insideThink = true;
        i += 6; // Skip the <think> tag
        continue;
      }

      if (content.slice(i, i + 8) === "</think>") {
        // Add the think block as a segment
        currentSegments.push({ type: "think", content: thinkContent });
        thinkContent = "";
        insideThink = false;
        i += 7; // Skip the </think> tag
        continue;
      }

      if (insideThink) {
        thinkContent += content[i];
      } else {
        currentText += content[i];
      }
    }

    // Add any remaining content
    if (currentText) {
      currentSegments.push({ type: "text", content: currentText });
    }

    if (thinkContent) {
      currentSegments.push({ type: "think", content: thinkContent });
    }

    setSegments(currentSegments);
  }, [children]);

  const renderSegment = (segment, index) => {
    if (segment.type === "think") {
      return <ThinkBlock key={index}>{segment.content}</ThinkBlock>;
    }

    return (
      <ReactMarkdown
        key={index}
        remarkPlugins={[remarkMath, supersub, remarkBreaks, remarkGfm]}
        rehypePlugins={[
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
          rehypeKatex,
          rehypeRaw,
        ]}
        components={{
          a: ({ node, ...props }) => {
            if (!props.title)
              return <a className="text-blue-600!" {...props} />;

            return (
              <CustomTooltip content={props.title}>
                <a
                  {...props}
                  target="_blank"
                  className="text-blue-600"
                  title={props.title}
                />
              </CustomTooltip>
            );
          },
          code: ({ node, inline, className, children, ...props }) => {
            if (!className) {
              return (
                <code className={className} dir="ltr" {...props}>
                  {children}
                </code>
              );
            }

            const match = /language-(\w+)/.exec(className || "");
            return (
              <CustomCode className={className} language={match?.[1] || ""}>
                {children}
              </CustomCode>
            );
          },
        }}
      >
        {preprocessLaTeX(segment.content)}
      </ReactMarkdown>
    );
  };

  return (
    <div className="markdown-content" dir="auto">
      {segments.map((segment, index) => renderSegment(segment, index))}
    </div>
  );
};

export default StreamingMarkdown;

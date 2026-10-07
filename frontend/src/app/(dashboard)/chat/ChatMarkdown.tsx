'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface ChatMarkdownProps {
  content: string;
}

/**
 * Splits the raw LLM content into:
 * 1. Main body text
 * 2. Disclaimer notice (if present)
 * 
 * Styles the disclaimer as a dedicated notice card without raw asterisks.
 * Renders bold, italics, inline code, headers, unordered/ordered lists (preserving exact numbering), and tables.
 */
export const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ content }) => {
  let bodyContent = content;
  let disclaimerText: string | null = null;

  // Patterns for backend disclaimer
  const noticeMarkers = [
    '> ⚠️ Notice:',
    '> ⚠️ **Notice**:',
    '> ⚠️ *Disclaimer / Automated Simulation Notice:',
    '> ⚠️',
    '**Notice**:',
    'Notice:',
    '**Automated Simulation Notice**:',
    'Automated Simulation Notice:'
  ];

  for (const marker of noticeMarkers) {
    const idx = bodyContent.indexOf(marker);
    if (idx !== -1) {
      disclaimerText = bodyContent.substring(idx);
      bodyContent = bodyContent.substring(0, idx).trim();
      // Clean marker, raw blockquote, and all raw asterisks from disclaimerText
      disclaimerText = disclaimerText
        .replace(/^>\s*⚠️?\s*\*?\*?(?:Notice|Disclaimer \/ Automated Simulation Notice|Automated Simulation Notice)\*?\*?:?/i, '')
        .replace(/^>\s*/gm, '')
        .replace(/\*/g, '')
        .trim();
      break;
    }
  }

  // Render markdown blocks
  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let unorderedItems: string[] = [];
    let orderedItems: { num: string; text: string }[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = (key: string) => {
      if (listType === 'ul' && unorderedItems.length > 0) {
        elements.push(
          <ul key={key} className="list-disc pl-5 my-1.5 space-y-1 text-stone-700 dark:text-stone-300">
            {unorderedItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {formatInline(item)}
              </li>
            ))}
          </ul>
        );
        unorderedItems = [];
        listType = null;
      } else if (listType === 'ol' && orderedItems.length > 0) {
        elements.push(
          <div key={key} className="my-1.5 space-y-1 text-stone-700 dark:text-stone-300">
            {orderedItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="font-semibold text-stone-900 dark:text-stone-100 min-w-[1.25rem] select-none text-right">
                  {item.num}.
                </span>
                <div className="flex-1">
                  {formatInline(item.text)}
                </div>
              </div>
            ))}
          </div>
        );
        orderedItems = [];
        listType = null;
      }
    };

    const flushTable = (key: string) => {
      if (tableRows.length > 0) {
        const headerRow = tableRows[0];
        const dataRows = tableRows.slice(1);
        elements.push(
          <div key={key} className="my-2.5 overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800 text-xs">
              <thead className="bg-stone-50 dark:bg-stone-900/60 text-stone-800 dark:text-stone-200 font-semibold">
                <tr>
                  {headerRow.map((cell, cIdx) => (
                    <th key={cIdx} className="px-3 py-2 text-left text-[11px] font-bold tracking-wider">
                      {formatInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 bg-white dark:bg-stone-900/30">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-1.5 text-stone-700 dark:text-stone-300">
                        {formatInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();

      // Check for table row
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (/^\|[-:\s|]+\|$/.test(trimmed)) {
          return;
        }
        flushList(`flush-list-${lineIdx}`);
        inTable = true;
        const cells = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable(`flush-table-${lineIdx}`);
      }

      // Check for unordered list (- or * or •)
      if (/^[-*•]\s+/.test(trimmed)) {
        if (listType !== 'ul') {
          flushList(`flush-list-switch-${lineIdx}`);
          listType = 'ul';
        }
        unorderedItems.push(trimmed.replace(/^[-*•]\s+/, ''));
        return;
      }

      // Check for numbered list (1. 2. etc.) -> Keep original numbering
      const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (olMatch) {
        if (listType !== 'ol') {
          flushList(`flush-list-switch-${lineIdx}`);
          listType = 'ol';
        }
        orderedItems.push({ num: olMatch[1], text: olMatch[2] });
        return;
      }

      // Non-list line
      flushList(`flush-list-line-${lineIdx}`);

      // Blank line
      if (!trimmed) {
        elements.push(<div key={`blank-${lineIdx}`} className="h-2" />);
        return;
      }

      // Headers
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={`h4-${lineIdx}`} className="font-bold text-sm text-stone-900 dark:text-stone-100 mt-2 mb-1">
            {formatInline(trimmed.substring(4))}
          </h4>
        );
        return;
      }
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h3 key={`h3-${lineIdx}`} className="font-bold text-sm text-stone-900 dark:text-stone-100 mt-2.5 mb-1">
            {formatInline(trimmed.substring(3))}
          </h3>
        );
        return;
      }

      // Standard paragraph
      elements.push(
        <p key={`p-${lineIdx}`} className="leading-relaxed text-stone-800 dark:text-stone-200 my-0.5">
          {formatInline(trimmed)}
        </p>
      );
    });

    flushList('flush-final-list');
    flushTable('flush-final-table');

    return elements;
  };

  /**
   * Formats inline markdown tokens:
   * - Bold & Italic: ***text*** or ___text___
   * - Bold: **text** or __text__
   * - Italic: *text* or _text_
   * - Inline code: `code`
   */
  const formatInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const tokenRegex = /(\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyIdx = 0;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const token = match[0];
      if (token.startsWith('***') && token.endsWith('***')) {
        parts.push(
          <strong key={`bi-${keyIdx++}`} className="font-semibold text-stone-900 dark:text-stone-100">
            <em className="italic">{token.slice(3, -3)}</em>
          </strong>
        );
      } else if (token.startsWith('___') && token.endsWith('___')) {
        parts.push(
          <strong key={`bi-${keyIdx++}`} className="font-semibold text-stone-900 dark:text-stone-100">
            <em className="italic">{token.slice(3, -3)}</em>
          </strong>
        );
      } else if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={`b-${keyIdx++}`} className="font-semibold text-stone-900 dark:text-stone-100">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('__') && token.endsWith('__')) {
        parts.push(
          <strong key={`b-${keyIdx++}`} className="font-semibold text-stone-900 dark:text-stone-100">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em key={`i-${keyIdx++}`} className="italic text-stone-800 dark:text-stone-200">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith('_') && token.endsWith('_')) {
        parts.push(
          <em key={`i-${keyIdx++}`} className="italic text-stone-800 dark:text-stone-200">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={`c-${keyIdx++}`}
            className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[11px] font-mono text-stone-800 dark:text-stone-200 border border-stone-200/60 dark:border-stone-700/60"
          >
            {token.slice(1, -1)}
          </code>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="space-y-1.5 text-xs">
      {renderFormattedText(bodyContent)}

      {/* Styled disclaimer notice if present */}
      {disclaimerText && (
        <div className="mt-3 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/20 dark:border-amber-700/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2.5 shadow-sm">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-amber-900 dark:text-amber-100 block">
              Notice
            </span>
            <p className="text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
              {disclaimerText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

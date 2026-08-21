import React from 'react';
import { Box, Text, useInput } from 'ink';
import { lexer, type Token, type Tokens } from 'marked';
import { SUMMARY_LOADING_STEPS, type SummaryState } from './useSummary.js';
import { THEME } from '../../../../shared/theme.js';
import { isTerminalMouseReport, parseMouseWheelScroll } from '../../../../utils/input.js';

type SummaryLine = {
  text: string;
  color: string;
  bold?: boolean;
  dim?: boolean;
};

export interface SummaryModeProps {
  contentWidth: number;
  contentHeight: number;
  summaryState: SummaryState;
  inputActive: boolean;
  commandMenuActive: boolean;
}

export function SummaryMode({
  contentWidth,
  contentHeight,
  summaryState,
  inputActive,
  commandMenuActive,
}: SummaryModeProps) {
  const [scroll, setScroll] = React.useState(0);
  const [animationFrame, setAnimationFrame] = React.useState(0);
  const lines = React.useMemo(
    () => buildSummaryLines(summaryState, Math.max(1, contentWidth), animationFrame),
    [animationFrame, contentWidth, summaryState],
  );
  const visibleRows = Math.max(1, contentHeight - 3);
  const maxScroll = Math.max(0, lines.length - visibleRows);
  const visibleLines = lines.slice(scroll, scroll + visibleRows);

  React.useEffect(() => {
    if (summaryState.status === 'loading' || summaryState.status === 'error') {
      setScroll(0);
    }
  }, [summaryState.status]);

  React.useEffect(() => {
    setScroll(current => Math.min(current, maxScroll));
  }, [maxScroll]);

  React.useEffect(() => {
    if (summaryState.status !== 'loading' && summaryState.status !== 'streaming') {
      setAnimationFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setAnimationFrame(current => (current + 1) % 4);
    }, 450);

    return () => {
      clearInterval(interval);
    };
  }, [summaryState.status]);

  useInput(
    (input, key) => {
      const mouseScroll = parseMouseWheelScroll(input);
      if (mouseScroll !== 0) {
        if (summaryState.status === 'ready' || summaryState.status === 'streaming') {
          setScroll(current => Math.max(0, Math.min(maxScroll, current + mouseScroll)));
        }
        return;
      }

      if (isTerminalMouseReport(input)) return;
      if (summaryState.status !== 'ready' && summaryState.status !== 'streaming') return;

      if (key.pageUp) {
        setScroll(current => Math.max(0, current - visibleRows));
        return;
      }

      if (key.pageDown) {
        setScroll(current => Math.min(maxScroll, current + visibleRows));
        return;
      }

      if (key.home) {
        setScroll(0);
        return;
      }

      if (key.end) {
        setScroll(maxScroll);
        return;
      }

      if (key.upArrow) {
        setScroll(current => Math.max(0, current - 1));
        return;
      }

      if (key.downArrow) {
        setScroll(current => Math.min(maxScroll, current + 1));
      }
    },
    { isActive: inputActive && !commandMenuActive },
  );

  return (
    <Box flexDirection="column">
      <Box marginTop={1} marginBottom={1} justifyContent="space-between">
        <Text color={THEME.text} bold>
          Summary
        </Text>
        <Text color={THEME.textMuted}>{getSummaryStatusLabel(summaryState.status, maxScroll)}</Text>
      </Box>

      <Box height={visibleRows} flexDirection="row" overflow="hidden">
        <Box width={Math.max(1, contentWidth - (maxScroll > 0 ? 2 : 0))} flexDirection="column">
          {visibleLines.map((line, index) => (
            <Text key={`${scroll + index}:${line.text}`} color={line.color} bold={line.bold} dimColor={line.dim}>
              {line.text || ' '}
            </Text>
          ))}
        </Box>
        {maxScroll > 0 && (
          <ScrollBar height={visibleRows} scroll={scroll} totalRows={lines.length} visibleRows={visibleRows} />
        )}
      </Box>
    </Box>
  );
}

function ScrollBar({
  height,
  scroll,
  totalRows,
  visibleRows,
}: {
  height: number;
  scroll: number;
  totalRows: number;
  visibleRows: number;
}) {
  const trackHeight = Math.max(1, height);
  const thumbHeight = Math.max(1, Math.floor((visibleRows / totalRows) * trackHeight));
  const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
  const maxScroll = Math.max(1, totalRows - visibleRows);
  const thumbTop = Math.min(maxThumbTop, Math.round((scroll / maxScroll) * maxThumbTop));

  return (
    <Box width={2} flexDirection="column" alignItems="flex-end">
      {Array.from({ length: trackHeight }, (_, index) => {
        const active = index >= thumbTop && index < thumbTop + thumbHeight;

        return (
          <Text key={index} color={active ? THEME.primary : THEME.rule}>
            {active ? '█' : '│'}
          </Text>
        );
      })}
    </Box>
  );
}

function buildSummaryLines(summaryState: SummaryState, width: number, animationFrame: number): SummaryLine[] {
  if (summaryState.status === 'loading') {
    const activeStepIndex = Math.max(
      0,
      SUMMARY_LOADING_STEPS.indexOf(summaryState.step as (typeof SUMMARY_LOADING_STEPS)[number]),
    );
    const dots = '.'.repeat((animationFrame % 3) + 1);

    return [
      { text: 'Preparing summary', color: THEME.text },
      ...SUMMARY_LOADING_STEPS.map((step, index) => {
        if (index < activeStepIndex) {
          return { text: `[x] ${step}`, color: THEME.success };
        }

        if (index === activeStepIndex) {
          return { text: `[>] ${step}${dots}`, color: THEME.text };
        }

        return { text: `[ ] ${step}`, color: THEME.textMuted };
      }),
    ].flatMap(line => wrapSummaryLine(line, width));
  }

  if (summaryState.status === 'error') {
    return wrapSummaryLine({ text: summaryState.error, color: THEME.danger }, width);
  }

  if (summaryState.status === 'streaming') {
    return appendStreamingIndicator(buildMarkdownSummaryLines(summaryState.response, width), animationFrame);
  }

  return buildMarkdownSummaryLines(summaryState.response, width);
}

function getSummaryStatusLabel(status: SummaryState['status'], maxScroll: number) {
  if (status === 'ready') {
    return maxScroll > 0 ? 'up/down scroll' : 'ready';
  }

  if (status === 'streaming') {
    return maxScroll > 0 ? 'streaming - up/down scroll' : 'streaming';
  }

  return status;
}

function wrapSummaryLine(line: SummaryLine, width: number) {
  return wrapText(line.text, width).map(text => ({
    text,
    color: line.color,
    bold: line.bold,
    dim: line.dim,
  }));
}

function buildMarkdownSummaryLines(markdown: string, width: number) {
  const lines: SummaryLine[] = [];

  try {
    for (const token of lexer(markdown, { gfm: true })) {
      appendMarkdownToken(lines, token, width);
    }
  } catch {
    return wrapSummaryLine({ text: markdown, color: THEME.text }, width);
  }

  const trimmedLines = trimBlankSummaryLines(lines);
  return trimmedLines.length > 0 ? trimmedLines : [{ text: ' ', color: THEME.textMuted }];
}

function appendMarkdownToken(lines: SummaryLine[], token: Token, width: number) {
  switch (token.type) {
    case 'space':
      appendBlankLine(lines);
      return;

    case 'heading': {
      appendBlankLine(lines);
      const heading = token as Tokens.Heading;
      const text = inlineText(heading.tokens) || heading.text;

      if (heading.depth === 1) {
        appendWrappedText(lines, text.toUpperCase(), width, { color: THEME.primary, bold: true });
        lines.push({ text: '-'.repeat(Math.min(text.length, width)), color: THEME.primary, dim: true });
      } else if (heading.depth === 2) {
        appendWrappedText(lines, text, width, { color: THEME.primary, bold: true });
      } else if (heading.depth === 3) {
        appendWrappedText(lines, text, width, { color: THEME.primary });
      } else {
        appendWrappedText(lines, text, width, { color: THEME.textMuted });
      }
      return;
    }

    case 'paragraph': {
      const paragraph = token as Tokens.Paragraph;
      appendWrappedText(lines, inlineText(paragraph.tokens) || paragraph.text, width, { color: THEME.text });
      return;
    }

    case 'text': {
      const text = token as Tokens.Text;
      appendWrappedText(lines, text.tokens ? inlineText(text.tokens) : text.text, width, { color: THEME.text });
      return;
    }

    case 'blockquote': {
      const quote = token as Tokens.Blockquote;
      const quoteLines = buildMarkdownLinesFromTokens(quote.tokens, Math.max(1, width - 2));
      for (const line of quoteLines) {
        appendWrappedText(lines, `| ${line.text}`, width, { color: THEME.textMuted, dim: true });
      }
      return;
    }

    case 'list':
      appendList(lines, token as Tokens.List, width);
      return;

    case 'code':
      appendCodeBlock(lines, token as Tokens.Code, width);
      return;

    case 'table':
      appendTable(lines, token as Tokens.Table, width);
      return;

    case 'hr':
      appendWrappedText(lines, '-'.repeat(Math.min(width, 40)), width, { color: THEME.textMuted, dim: true });
      return;

    case 'html': {
      const html = token as Tokens.HTML;
      appendWrappedText(lines, html.text, width, { color: THEME.textMuted, dim: true });
      return;
    }

    default:
      if ('tokens' in token && Array.isArray(token.tokens)) {
        for (const child of token.tokens) {
          appendMarkdownToken(lines, child, width);
        }
      } else if ('text' in token && typeof token.text === 'string') {
        appendWrappedText(lines, token.text, width, { color: THEME.text });
      }
  }
}

function buildMarkdownLinesFromTokens(tokens: Token[], width: number) {
  const lines: SummaryLine[] = [];
  for (const token of tokens) appendMarkdownToken(lines, token, width);
  return trimBlankSummaryLines(lines);
}

function appendList(lines: SummaryLine[], list: Tokens.List, width: number) {
  const start = typeof list.start === 'number' ? list.start : 1;

  list.items.forEach((item, index) => {
    const marker = list.ordered ? `${start + index}.` : '-';
    const checkbox = item.task ? `${item.checked ? '[x]' : '[ ]'} ` : '';
    const prefix = `${marker} ${checkbox}`;
    const childLines = buildMarkdownLinesFromTokens(item.tokens, Math.max(1, width - prefix.length));

    if (childLines.length === 0) {
      appendWrappedText(lines, prefix.trimEnd(), width, { color: THEME.text });
      return;
    }

    childLines.forEach((line, childIndex) => {
      const linePrefix = childIndex === 0 ? prefix : ' '.repeat(prefix.length);
      appendWrappedText(lines, `${linePrefix}${line.text}`, width, {
        color: line.color,
        bold: line.bold,
        dim: line.dim,
      });
    });
  });
}

function appendCodeBlock(lines: SummaryLine[], code: Tokens.Code, width: number) {
  appendBlankLine(lines);
  if (code.lang) {
    appendWrappedText(lines, code.lang, width, { color: THEME.textMuted, dim: true });
  }

  const codeLines = code.text.split('\n');
  for (const line of codeLines.length > 0 ? codeLines : ['']) {
    appendWrappedText(lines, line || ' ', width, { color: THEME.code });
  }
  appendBlankLine(lines);
}

function appendTable(lines: SummaryLine[], table: Tokens.Table, width: number) {
  const rows = [table.header, ...table.rows];
  const columnWidths = table.header.map((_, columnIndex) => {
    const widestCell = rows.reduce(
      (widest, row) => Math.max(widest, inlineText(row[columnIndex]?.tokens ?? []).length),
      0,
    );
    return Math.min(Math.max(1, widestCell), Math.max(1, Math.floor(width / Math.max(1, table.header.length)) - 2));
  });

  rows.forEach((row, rowIndex) => {
    const cells = row.map((cell, columnIndex) =>
      truncate(inlineText(cell.tokens), columnWidths[columnIndex] ?? 8).padEnd(columnWidths[columnIndex] ?? 8),
    );
    appendWrappedText(lines, cells.join('  ').trimEnd(), width, {
      color: rowIndex === 0 ? THEME.primary : THEME.text,
      bold: rowIndex === 0,
    });
  });
}

function appendWrappedText(lines: SummaryLine[], text: string, width: number, style: Omit<SummaryLine, 'text'>) {
  for (const wrapped of wrapText(text, width)) {
    lines.push({ text: wrapped, ...style });
  }
}

function appendBlankLine(lines: SummaryLine[]) {
  const previous = lines[lines.length - 1];
  if (!previous || previous.text === '') return;
  lines.push({ text: '', color: THEME.textMuted });
}

function trimBlankSummaryLines(lines: SummaryLine[]) {
  let start = 0;
  let end = lines.length;

  while (start < end && lines[start]?.text === '') start += 1;
  while (end > start && lines[end - 1]?.text === '') end -= 1;

  return lines.slice(start, end);
}

function inlineText(tokens: Token[]): string {
  return tokens
    .map(token => {
      switch (token.type) {
        case 'text':
        case 'escape':
        case 'codespan':
        case 'html':
          return 'text' in token && typeof token.text === 'string' ? token.text : '';

        case 'strong':
        case 'em':
        case 'del':
          return inlineText((token as Tokens.Strong | Tokens.Em | Tokens.Del).tokens);

        case 'link': {
          const link = token as Tokens.Link;
          const label = inlineText(link.tokens) || link.text;
          return link.href ? `${label} (${link.href})` : label;
        }

        case 'image': {
          const image = token as Tokens.Image;
          return image.href ? `${image.text || 'image'} (${image.href})` : image.text;
        }

        case 'br':
          return '\n';

        default:
          if ('tokens' in token && Array.isArray(token.tokens)) return inlineText(token.tokens);
          if ('text' in token && typeof token.text === 'string') return token.text;
          return '';
      }
    })
    .join('');
}

function appendStreamingIndicator(lines: SummaryLine[], animationFrame: number) {
  const indicator = '.'.repeat((animationFrame % 3) + 1);

  if (lines.length === 0) {
    return [{ text: indicator, color: THEME.textMuted }];
  }

  return lines.map((line, index) => {
    if (index !== lines.length - 1) return line;

    return {
      ...line,
      text: `${line.text}${indicator}`,
    };
  });
}

function wrapText(text: string, width: number) {
  return text.split('\n').flatMap(line => {
    if (!line) return [''];

    const chunks: string[] = [];
    for (let index = 0; index < line.length; index += width) {
      chunks.push(line.slice(index, index + width));
    }

    return chunks.length > 0 ? chunks : [''];
  });
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

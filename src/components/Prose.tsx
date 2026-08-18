import { Fragment, type ReactNode } from 'react';

/**
 * Renders the small Markdown subset the owner can use in the dashboard editors:
 * `##`/`###` headings, `-`/`•` bullets, `**bold**`, and blank-line paragraphs.
 * Text is escaped by React, so owner copy can never inject markup.
 */
export function Prose({ body, className = '' }: { body: string; className?: string }) {
  return <div className={`prose-copy ${className}`}>{renderBlocks(body)}</div>;
}

function renderBlocks(body: string): ReactNode[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];

  let paragraph: string[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p key={key++}>{inline(paragraph.join(' '))}</p>);
      paragraph = [];
    }
  };

  const flushBullets = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={key++}>
          {bullets.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      flushBullets();
      continue;
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushBullets();
      const text = inline(heading[2]);
      blocks.push(
        heading[1].length === 2 ? <h2 key={key++}>{text}</h2> : <h3 key={key++}>{text}</h3>,
      );
      continue;
    }

    const bullet = /^\s*[-•*]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      bullets.push(bullet[1]);
      continue;
    }

    flushBullets();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushBullets();
  return blocks;
}

function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    return bold ? <strong key={i}>{bold[1]}</strong> : <Fragment key={i}>{part}</Fragment>;
  });
}

/** Preformatted blocks (banking details, emergency numbers) keep their layout. */
export function Preformatted({ body }: { body: string }) {
  return (
    <pre className="whitespace-pre-wrap font-sans text-[0.9375rem] leading-7 text-navy-soft">
      {body}
    </pre>
  );
}

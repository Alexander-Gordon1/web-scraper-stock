// components/feed/PostCard.tsx

export type Article = {
  title: string;
  url: string;
  time_published: string;
  authors: string[];
  summary: string;
  source: string;
  overall_sentiment_label: string;
};

const sentimentColors: Record<string, string> = {
  "Bullish": "text-emerald-600",
  "Somewhat-Bullish": "text-emerald-400",
  "Neutral": "text-gray-300",
  "Somewhat-Bearish": "text-red-300",
  "Bearish": "text-red-600",
};

const sentimentColorsBorder: Record<string, string> = {
  "Bullish": "border-emerald-400",
  "Somewhat-Bullish": "border-emerald-600",
  "Neutral": "border-gray-300",
  "Somewhat-Bearish": "border-red-300",
  "Bearish": "border-red-600",
};

function formatDate(raw: string) {
  const year  = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day   = raw.slice(6, 8);
  const hour  = raw.slice(9, 11);
  const min   = raw.slice(11, 13);
  return `${day}/${month}/${year} ${hour}:${min}`;
}

export default function PostCard({ article }: { article: Article }) {
  return (
    <div className={`${ sentimentColorsBorder[article.overall_sentiment_label] ?? "text-gray-500"} 
    w-72 flex-shrink-0 py-4 px-5 rounded-lg font-[Calibri] shadow-sm border-4 border-[#D0BDF4] bg-[#262826] flex flex-col gap-2`}>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="text-gray-400">{article.source}</span>
        <span>{formatDate(article.time_published)}</span>
      </div>

      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-base font-semibold text-indigo-500 hover:underline leading-snug"
      >
        {article.title}
      </a>

      <p className="text-sm text-white line-clamp-3">{article.summary}</p>

      <div className="flex items-center justify-between text-xs mt-1">
        <span className="text-gray-400">
          {article.authors.length > 0 ? `By ${article.authors.join(", ")}` : ""}
        </span>
        <span className={`text-[15px] ${sentimentColors[article.overall_sentiment_label] ?? "text-gray-500"}`}>{article.overall_sentiment_label}</span>
      </div>

    </div>
  );
}

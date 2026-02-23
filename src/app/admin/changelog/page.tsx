import { CHANGELOG } from '@/lib/changelog-data'

const TAG_STYLES: Record<string, string> = {
  feature: 'bg-emerald-100 text-emerald-700',
  fix: 'bg-amber-100 text-amber-700',
  infra: 'bg-blue-100 text-blue-700',
  docs: 'bg-purple-100 text-purple-700',
}

export default function ChangelogPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-800">Changelog</h1>
      <p className="mb-6 text-sm text-slate-500">
        A chronological record of features, fixes, and infrastructure changes.
      </p>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute top-0 bottom-0 left-[18px] w-0.5 bg-slate-200" />

        <div className="space-y-4">
          {CHANGELOG.map((entry, i) => (
            <div key={i} className="relative flex gap-4 pl-10">
              {/* Timeline dot */}
              <div
                className={`absolute left-[12px] top-2 h-3 w-3 rounded-full border-2 border-white ${
                  entry.tag === 'feature'
                    ? 'bg-emerald-500'
                    : entry.tag === 'fix'
                      ? 'bg-amber-500'
                      : entry.tag === 'infra'
                        ? 'bg-blue-500'
                        : 'bg-purple-500'
                }`}
              />

              <div className="flex-1 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">
                    {entry.date}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${TAG_STYLES[entry.tag] || TAG_STYLES.feature}`}
                  >
                    {entry.tag}
                  </span>
                  {entry.commit && (
                    <a
                      href={`https://github.com/jpwilson/colabboard/commit/${entry.commit}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-[10px] font-medium text-blue-500 hover:text-blue-700 hover:underline"
                    >
                      Code changes
                    </a>
                  )}
                </div>
                <h3 className="mb-1 text-sm font-semibold text-slate-800">
                  {entry.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-500">
                  {entry.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

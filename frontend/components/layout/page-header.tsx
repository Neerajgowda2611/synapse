import { ReactNode } from "react"
import Link from "next/link"

type Breadcrumb = {
  label: string
  href?: string
}

type PageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
  breadcrumbs?: Breadcrumb[]
}

export function PageHeader({ title, description, action, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-8 space-y-4">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
              {index > 0 && <span className="text-border">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}

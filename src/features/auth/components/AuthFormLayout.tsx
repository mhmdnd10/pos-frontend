import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card'

interface AuthFormLayoutProps {
  title: string
  description: string
  children: ReactNode
  footerText?: string
  footerLinkLabel?: string
  footerLinkTo?: string
}

export function AuthFormLayout({
  title,
  description,
  children,
  footerText,
  footerLinkLabel,
  footerLinkTo,
}: AuthFormLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
        {footerText && footerLinkLabel && footerLinkTo ? (
          <div className="px-6 pb-6 text-center text-sm text-muted-foreground">
            {footerText}{' '}
            <Link className="font-medium text-primary hover:underline" to={footerLinkTo}>
              {footerLinkLabel}
            </Link>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
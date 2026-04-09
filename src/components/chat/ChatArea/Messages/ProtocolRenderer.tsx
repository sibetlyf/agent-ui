import React from 'react'

interface Protocol {
  content_type?: string
  data: unknown
}

export default function ProtocolRenderer({ protocols }: { protocols: Protocol[] }) {
  if (!protocols || protocols.length === 0) return null

  return (
    <div className="flex flex-col gap-4 w-full mt-2 font-geist">
      {protocols.map((protocol, idx) => (
        <div key={idx} className="w-full rounded-lg border border-border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-4 pb-2">
            <h3 className="font-semibold leading-none tracking-tight text-primary capitalize">
              {protocol.content_type ? protocol.content_type.replace(/_/g, ' ') : 'Protocol'}
            </h3>
          </div>
          <div className="p-4 pt-0">
            <div className="text-sm space-y-3">
              {protocol.data && typeof protocol.data === 'object' ? (
                Object.entries(protocol.data as Record<string, unknown>).map(([key, value]) => {
                  if (value === null || value === undefined) return null;
                  const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
                  return (
                    <div key={key} className="flex flex-col">
                      <span className="font-medium text-muted-foreground capitalize mb-1">{key.replace(/_/g, ' ')}</span>
                      {typeof value === 'object' ? (
                        <pre className="bg-muted/30 p-2.5 rounded-md text-xs whitespace-pre-wrap overflow-x-auto border border-border/50 font-mono">
                          {displayValue}
                        </pre>
                      ) : (
                        <span className="text-foreground">{displayValue}</span>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-col">
                  <span className="text-foreground whitespace-pre-wrap break-words">{String(protocol.data)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

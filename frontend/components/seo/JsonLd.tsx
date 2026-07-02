/** Renders a JSON-LD block. Server-component-safe. */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
    return (
        <script
            type="application/ld+json"
            // JSON-LD is not user-editable HTML; escape closing tags defensively.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
        />
    );
}

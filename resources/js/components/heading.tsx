export default function Heading({
    title,
    description,
    variant = 'default',
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
}) {
    return (
        <header
            className={variant === 'small' ? '' : 'mb-6 space-y-1 sm:mb-8'}
            data-reveal="up"
            data-reveal-distance="sm"
        >
            <h2
                className={
                    variant === 'small'
                        ? 'mb-0.5 text-base font-medium'
                        : 'text-xl font-semibold tracking-tight'
                }
            >
                {title}
            </h2>
            {description && (
                <p className="text-sm leading-6 text-muted-foreground">
                    {description}
                </p>
            )}
        </header>
    );
}

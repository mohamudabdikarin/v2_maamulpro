type DotLoaderProps = { label?: string; className?: string };

const DotLoader = ({ label = 'Loading', className = '' }: DotLoaderProps) => (
    <div className={`maamulpro-dot-loader ${className}`} aria-busy="true" aria-label={label} role="status">
        {Array.from({ length: 12 }, (_, index) => <span key={index} style={{ transform: `rotate(${index * 30}deg) translateY(-15px)`, animationDelay: `${index * -0.1}s` }} />)}
    </div>
);

export default DotLoader;

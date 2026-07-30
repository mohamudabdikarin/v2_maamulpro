import { ImgHTMLAttributes, useEffect, useState } from 'react';
import { apiBlob } from '../../lib/api';

type Props = ImgHTMLAttributes<HTMLImageElement> & { src: string };

const isPrivateBlob = (src: string) =>
    src.includes('.blob.vercel-storage.com')
    && !src.includes('.public.blob.vercel-storage.com');

export const AuthenticatedImage = ({ src, className, alt = '', ...props }: Props) => {
    const [resolved, setResolved] = useState(isPrivateBlob(src) ? '' : src);

    useEffect(() => {
        if (!isPrivateBlob(src)) {
            setResolved(src);
            return;
        }
        let active = true;
        let objectUrl = '';
        setResolved('');
        apiBlob(`/api/uploads/images/content?url=${encodeURIComponent(src)}`)
            .then((blob) => {
                if (!active) return;
                objectUrl = URL.createObjectURL(blob);
                setResolved(objectUrl);
            })
            .catch(() => setResolved(''));
        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src]);

    if (!resolved) {
        return <span aria-hidden="true" className={`inline-block bg-gray-100 dark:bg-dark ${className || ''}`} />;
    }
    return <img {...props} alt={alt} className={className} src={resolved} />;
};

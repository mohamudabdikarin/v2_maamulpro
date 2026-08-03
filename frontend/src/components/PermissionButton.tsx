import { ButtonHTMLAttributes, ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    children: ReactNode;
    fallback?: ReactNode;
    disabledTooltip?: string;
};

type SinglePerm = BaseProps & { perm: string; perms?: never; mode?: never };
type MultiPerm = BaseProps & { perms: string[]; mode?: 'any' | 'all'; perm?: never };

export type PermissionButtonProps = SinglePerm | MultiPerm;

export const PermissionButton = (props: PermissionButtonProps) => {
    const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
    const { children, fallback = null, disabledTooltip, ...rest } = props as BaseProps & {
        perm?: string;
        perms?: string[];
        mode?: 'any' | 'all';
    };

    const allowed = (() => {
        if ('perm' in props && props.perm) return hasPermission(props.perm);
        if ('perms' in props && props.perms) {
            return props.mode === 'all' ? hasAllPermissions(props.perms) : hasAnyPermission(props.perms);
        }
        return true;
    })();

    if (!allowed) {
        if (fallback === null || fallback === undefined) return null;
        if (disabledTooltip) {
            return (
                <button
                    type="button"
                    {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
                    disabled
                    title={disabledTooltip}
                    onClick={undefined}
                >
                    {fallback}
                </button>
            );
        }
        return <>{fallback}</>;
    }

    return <button type="button" {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>;
};

export default PermissionButton;

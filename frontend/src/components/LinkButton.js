import { Link } from 'react-router-dom';

export const LinkButton = ({
    to,
    children,
    type,
    onClick,
    buttonStyle = 'primary',
    buttonSize = 'medium',
    className = ''
}) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const styles = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
        outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
        long: 'w-full bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500'
    };

    const sizes = {
        medium: 'px-4 py-2 text-sm',
        large: 'px-6 py-3 text-base'
    };

    const buttonClasses = `${baseStyles} ${styles[buttonStyle] || styles.primary} ${sizes[buttonSize] || sizes.medium} ${className}`;

    return (
        <Link to={to} className="inline-block">
            <button
                className={buttonClasses}
                onClick={onClick}
                type={type}
            >
                {children}
            </button>
        </Link>
    );
}
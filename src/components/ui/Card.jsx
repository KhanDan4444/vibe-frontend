import React from 'react';
import { cardSurface, panelQuiet } from '../../utils/surfaceClasses';

/**
 * @param {object} props
 * @param {boolean} [props.quiet] - softer ring for metrics / nested panels
 * @param {string} [props.className]
 */
export default function Card({ quiet = false, className = '', children, ...rest }) {
  return (
    <div className={[quiet ? panelQuiet : cardSurface, className].join(' ')} {...rest}>
      {children}
    </div>
  );
}

import React from 'react';

export default function Card({ title, value, helper, icon: Icon, tone = 'default', children }) {
  return (
    <div className={`card tone-${tone}`}>
      <div className="card-header">
        <span className="card-label">{title}</span>
        {Icon ? (
          <div className="card-icon">
            <Icon size={18} />
          </div>
        ) : null}
      </div>

      {value !== undefined ? <strong className="card-value">{value}</strong> : null}
      {helper ? <p className="card-helper">{helper}</p> : null}
      {children}
    </div>
  );
}

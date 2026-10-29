import { useId, useState } from 'react';

interface EnrollmentKeyFieldProps {
  value: string;
  onChange: (value: string) => void;
  hint: string;
  disabled?: boolean;
  required?: boolean;
  settingKey?: boolean;
}

function EnrollmentKeyField({ value, onChange, hint, disabled = false, required = false, settingKey = false }: EnrollmentKeyFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-[#405057]" htmlFor={id}>
        Enrollment key {required && <strong className="text-[#bd2f35]">*</strong>}
      </label>
      <div className="relative">
        <input
          aria-describedby={`${id}-hint`}
          autoComplete={settingKey ? 'new-password' : 'off'}
          className="h-11 w-full rounded-lg border border-[#d6e1e4] bg-white pl-3.5 pr-16 text-base outline-none focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10 disabled:bg-[#f1f4f5]"
          disabled={disabled}
          id={id}
          maxLength={72}
          onChange={(event) => onChange(event.target.value)}
          placeholder={settingKey ? 'Set a key to share with your students' : 'Enter the key from your teacher'}
          required={required}
          type={visible ? 'text' : 'password'}
          value={value}
        />
        <button aria-label={visible ? 'Hide enrollment key' : 'Show enrollment key'} aria-pressed={visible} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#00778b]" disabled={disabled} onClick={() => setVisible((current) => !current)} type="button">
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      <p className="text-xs leading-5 text-[#718087]" id={`${id}-hint`}>{hint}</p>
    </div>
  );
}

export default EnrollmentKeyField;

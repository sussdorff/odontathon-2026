import { User, Shield, Star, Stethoscope } from 'lucide-react'
import { calculateAge } from '@/lib/utils'
import type { Patient } from '@/types'

interface PatientInfoProps {
  patient: Patient
}

export function PatientInfo({ patient }: PatientInfoProps) {
  const age = patient.birthDate ? calculateAge(patient.birthDate) : '?'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
      <InfoItem icon={<User size={14} />} label="Name" value={patient.name} />
      <InfoItem icon={<Star size={14} />} label="Alter" value={`${age} Jahre`} />
      <InfoItem
        icon={<Shield size={14} />}
        label="Versicherung"
        value={
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
              patient.coverageType === 'PKV'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-blue-100 text-blue-800 border border-blue-300'
            }`}
          >
            {patient.coverageType}
          </span>
        }
      />
      <InfoItem
        icon={<Stethoscope size={14} />}
        label="Befunde"
        value={
          <span className="font-bold text-gray-800">
            {patient.findingsCount}
            {patient.bonusPercent > 0 && (
              <span className="ml-1.5 text-xs font-normal text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                {patient.bonusPercent}% Bonus
              </span>
            )}
          </span>
        }
      />
    </div>
  )
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[0.65rem] text-blue-500 uppercase tracking-wider font-semibold">
        {icon}
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  )
}

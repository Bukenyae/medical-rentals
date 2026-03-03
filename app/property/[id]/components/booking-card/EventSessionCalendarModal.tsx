'use client';

import RangeCalendarModal from '../RangeCalendarModal';

type Props = {
  show: boolean;
  activeField: 'start' | 'end';
  startDate: string;
  endDate: string;
  onClose: () => void;
  onActiveFieldChange: (field: 'start' | 'end') => void;
  onApply: (startDate: string, endDate: string) => void;
  onReset: () => void;
};

export default function EventSessionCalendarModal({
  show,
  activeField,
  startDate,
  endDate,
  onClose,
  onActiveFieldChange,
  onApply,
  onReset,
}: Props) {
  return (
    <RangeCalendarModal
      show={show}
      activeField={activeField}
      startDate={startDate}
      endDate={endDate}
      startFieldLabel="Start"
      endFieldLabel="End"
      startTitle="Select session start date"
      endTitle="Select session end date"
      closeAriaLabel="Close event session calendar"
      onClose={onClose}
      onActiveFieldChange={onActiveFieldChange}
      onApply={onApply}
      onReset={onReset}
    />
  );
}

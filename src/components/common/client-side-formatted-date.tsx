
"use client";

import { useState, useEffect } from 'react';

interface ClientSideFormattedDateProps {
  isoDateString: string;
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
  placeholder?: React.ReactNode; 
}

export function ClientSideFormattedDate({ 
  isoDateString, 
  locale = 'en-PK', 
  options, 
  placeholder = "Loading date..." 
}: ClientSideFormattedDateProps) {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    if (isoDateString) {
      try {
        const date = new Date(isoDateString);
        if (!isNaN(date.getTime())) {
          setFormattedDate(date.toLocaleString(locale, options));
        } else {
          setFormattedDate("Invalid date");
        }
      } catch (error) {
        console.error("Error formatting date:", error);
        setFormattedDate("Error");
      }
    } else {
      setFormattedDate(""); 
    }
  }, [isoDateString, locale, options]);

  if (formattedDate === null) {
    return <>{placeholder}</>;
  }

  return <>{formattedDate}</>;
}

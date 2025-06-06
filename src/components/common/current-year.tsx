
"use client";
import { useState, useEffect } from 'react';

export function CurrentYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  if (year === null) {
    // Return a non-breaking space or a simple placeholder for SSR and initial client render
    return <>&nbsp;</>; 
  }
  return <>{year}</>;
}

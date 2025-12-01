// Common mental health ICD-10 diagnosis codes
export const ICD10_CODES = [
  // Mood Disorders
  { code: "F32.0", description: "Major depressive disorder, single episode, mild" },
  { code: "F32.1", description: "Major depressive disorder, single episode, moderate" },
  { code: "F32.2", description: "Major depressive disorder, single episode, severe without psychotic features" },
  { code: "F32.9", description: "Major depressive disorder, single episode, unspecified" },
  { code: "F33.0", description: "Major depressive disorder, recurrent, mild" },
  { code: "F33.1", description: "Major depressive disorder, recurrent, moderate" },
  { code: "F33.2", description: "Major depressive disorder, recurrent, severe without psychotic features" },
  { code: "F33.9", description: "Major depressive disorder, recurrent, unspecified" },
  { code: "F34.1", description: "Dysthymic disorder (Persistent depressive disorder)" },

  // Anxiety Disorders
  { code: "F41.0", description: "Panic disorder without agoraphobia" },
  { code: "F41.1", description: "Generalized anxiety disorder" },
  { code: "F41.9", description: "Anxiety disorder, unspecified" },
  { code: "F40.10", description: "Social anxiety disorder (Social phobia)" },
  { code: "F40.00", description: "Agoraphobia, unspecified" },
  { code: "F40.8", description: "Other specified phobia" },

  // Trauma and Stress-Related Disorders
  { code: "F43.10", description: "Post-traumatic stress disorder, unspecified" },
  { code: "F43.11", description: "Post-traumatic stress disorder, acute" },
  { code: "F43.12", description: "Post-traumatic stress disorder, chronic" },
  { code: "F43.0", description: "Acute stress reaction" },
  { code: "F43.20", description: "Adjustment disorder, unspecified" },
  { code: "F43.21", description: "Adjustment disorder with depressed mood" },
  { code: "F43.22", description: "Adjustment disorder with anxiety" },
  { code: "F43.23", description: "Adjustment disorder with mixed anxiety and depressed mood" },

  // OCD and Related Disorders
  { code: "F42.2", description: "Obsessive-compulsive disorder, mixed" },
  { code: "F42.3", description: "Hoarding disorder" },
  { code: "F45.22", description: "Body dysmorphic disorder" },

  // Bipolar and Related Disorders
  { code: "F31.0", description: "Bipolar disorder, current episode hypomanic" },
  { code: "F31.10", description: "Bipolar disorder, current episode manic without psychotic features" },
  { code: "F31.30", description: "Bipolar disorder, current episode depressed, mild or moderate" },
  { code: "F31.9", description: "Bipolar disorder, unspecified" },

  // Substance Use Disorders
  { code: "F10.10", description: "Alcohol use disorder, mild" },
  { code: "F10.20", description: "Alcohol use disorder, moderate/severe" },
  { code: "F12.10", description: "Cannabis use disorder, mild" },
  { code: "F12.20", description: "Cannabis use disorder, moderate/severe" },
  { code: "F11.10", description: "Opioid use disorder, mild" },
  { code: "F11.20", description: "Opioid use disorder, moderate/severe" },

  // Eating Disorders
  { code: "F50.00", description: "Anorexia nervosa, unspecified" },
  { code: "F50.01", description: "Anorexia nervosa, restricting type" },
  { code: "F50.02", description: "Anorexia nervosa, binge eating/purging type" },
  { code: "F50.2", description: "Bulimia nervosa" },
  { code: "F50.81", description: "Binge eating disorder" },

  // Sleep Disorders
  { code: "F51.01", description: "Primary insomnia" },
  { code: "G47.00", description: "Insomnia, unspecified" },

  // ADHD
  { code: "F90.0", description: "ADHD, predominantly inattentive type" },
  { code: "F90.1", description: "ADHD, predominantly hyperactive type" },
  { code: "F90.2", description: "ADHD, combined type" },
  { code: "F90.9", description: "ADHD, unspecified type" },

  // Personality Disorders
  { code: "F60.3", description: "Borderline personality disorder" },
  { code: "F60.4", description: "Histrionic personality disorder" },
  { code: "F60.5", description: "Obsessive-compulsive personality disorder" },
  { code: "F60.6", description: "Avoidant personality disorder" },
  { code: "F60.7", description: "Dependent personality disorder" },
  { code: "F60.81", description: "Narcissistic personality disorder" },
  { code: "F60.9", description: "Personality disorder, unspecified" },

  // Other Common Codes
  { code: "F99", description: "Mental disorder, not otherwise specified" },
  { code: "Z63.0", description: "Problems in relationship with spouse or partner" },
  { code: "Z63.4", description: "Disappearance and death of family member" },
  { code: "Z63.5", description: "Disruption of family by separation and divorce" },
  { code: "Z73.0", description: "Burnout" },
] as const;

export type ICD10Code = typeof ICD10_CODES[number];

// Helper to search/filter codes
export function searchICD10Codes(query: string): typeof ICD10_CODES[number][] {
  const lowerQuery = query.toLowerCase();
  return ICD10_CODES.filter(
    item =>
      item.code.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery)
  );
}

// Get description for a code
export function getICD10Description(code: string): string | undefined {
  const found = ICD10_CODES.find(item => item.code === code);
  return found?.description;
}

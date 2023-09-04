export type Language = 'C' | 'JAVA' | 'CPP';

export type Codes = Partial<Record<Language, string>>;

export type Templates = {
  solution: Codes;
  judge: Codes;
};

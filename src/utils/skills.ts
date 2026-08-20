/**
 * Skill taxonomy + text extraction.
 * The AI engine uses this to turn free-text resumes and job descriptions
 * into comparable, structured skill sets.
 */

export type SkillCategory =
  | "Frontend"
  | "Backend"
  | "Database"
  | "DevOps"
  | "Data & AI"
  | "Mobile"
  | "Testing"
  | "Core CS"
  | "Design"
  | "Workplace";

export interface SkillDef {
  name: string;
  aliases: string[];
  category: SkillCategory;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const SKILL_DEFS: SkillDef[] = [
  // Frontend
  { name: "JavaScript", aliases: ["javascript", "ecmascript", "es6"], category: "Frontend" },
  { name: "TypeScript", aliases: ["typescript"], category: "Frontend" },
  { name: "React", aliases: ["react.js", "reactjs", "react"], category: "Frontend" },
  { name: "Next.js", aliases: ["next.js", "nextjs"], category: "Frontend" },
  { name: "Vue", aliases: ["vue.js", "vuejs", "vue"], category: "Frontend" },
  { name: "Angular", aliases: ["angular"], category: "Frontend" },
  { name: "HTML", aliases: ["html5", "html"], category: "Frontend" },
  { name: "CSS", aliases: ["css3", "css"], category: "Frontend" },
  { name: "Tailwind CSS", aliases: ["tailwind css", "tailwind"], category: "Frontend" },
  { name: "Redux", aliases: ["redux"], category: "Frontend" },
  { name: "Accessibility", aliases: ["accessibility", "wcag", "a11y"], category: "Frontend" },
  { name: "Design Systems", aliases: ["design system", "design systems", "storybook"], category: "Frontend" },
  // Backend
  { name: "Node.js", aliases: ["node.js", "nodejs", "node"], category: "Backend" },
  { name: "Express", aliases: ["express.js", "express"], category: "Backend" },
  { name: "Python", aliases: ["python"], category: "Backend" },
  { name: "Django", aliases: ["django"], category: "Backend" },
  { name: "Flask", aliases: ["flask"], category: "Backend" },
  { name: "Java", aliases: ["java"], category: "Backend" },
  { name: "Spring Boot", aliases: ["spring boot", "spring"], category: "Backend" },
  { name: "C# / .NET", aliases: ["csharp", ".net", "dotnet", "c#"], category: "Backend" },
  { name: "PHP", aliases: ["php"], category: "Backend" },
  { name: "Laravel", aliases: ["laravel"], category: "Backend" },
  { name: "Ruby on Rails", aliases: ["ruby on rails", "rails", "ruby"], category: "Backend" },
  { name: "Go", aliases: ["golang"], category: "Backend" },
  { name: "GraphQL", aliases: ["graphql"], category: "Backend" },
  { name: "REST APIs", aliases: ["rest apis", "rest api", "restful", "rest"], category: "Backend" },
  { name: "Microservices", aliases: ["microservices", "microservice"], category: "Backend" },
  { name: "WordPress", aliases: ["wordpress"], category: "Backend" },
  { name: "SEO", aliases: ["seo"], category: "Backend" },
  // Database
  { name: "SQL", aliases: ["sql"], category: "Database" },
  { name: "PostgreSQL", aliases: ["postgresql", "postgres"], category: "Database" },
  { name: "MySQL", aliases: ["mysql"], category: "Database" },
  { name: "MongoDB", aliases: ["mongodb", "mongo"], category: "Database" },
  { name: "Redis", aliases: ["redis"], category: "Database" },
  // DevOps
  { name: "Git", aliases: ["github", "gitlab", "git"], category: "DevOps" },
  { name: "Docker", aliases: ["docker"], category: "DevOps" },
  { name: "Kubernetes", aliases: ["kubernetes", "k8s"], category: "DevOps" },
  { name: "AWS", aliases: ["amazon web services", "aws"], category: "DevOps" },
  { name: "Azure", aliases: ["azure"], category: "DevOps" },
  { name: "CI/CD", aliases: ["ci/cd", "cicd", "continuous integration"], category: "DevOps" },
  { name: "Linux", aliases: ["linux", "bash"], category: "DevOps" },
  // Data & AI
  { name: "Machine Learning", aliases: ["machine learning"], category: "Data & AI" },
  { name: "Pandas", aliases: ["pandas"], category: "Data & AI" },
  { name: "NumPy", aliases: ["numpy"], category: "Data & AI" },
  { name: "TensorFlow", aliases: ["tensorflow"], category: "Data & AI" },
  { name: "PyTorch", aliases: ["pytorch"], category: "Data & AI" },
  { name: "Data Analysis", aliases: ["data analysis", "analytics"], category: "Data & AI" },
  { name: "Power BI", aliases: ["power bi"], category: "Data & AI" },
  { name: "Excel", aliases: ["excel"], category: "Data & AI" },
  // Mobile
  { name: "React Native", aliases: ["react native"], category: "Mobile" },
  { name: "Flutter", aliases: ["flutter"], category: "Mobile" },
  { name: "Swift", aliases: ["swift"], category: "Mobile" },
  { name: "Kotlin", aliases: ["kotlin"], category: "Mobile" },
  // Testing
  { name: "Jest", aliases: ["jest"], category: "Testing" },
  { name: "Cypress", aliases: ["cypress"], category: "Testing" },
  { name: "Unit Testing", aliases: ["unit testing", "unit tests", "unit test", "junit", "pytest"], category: "Testing" },
  // Core CS
  { name: "Data Structures & Algorithms", aliases: ["data structures", "algorithms"], category: "Core CS" },
  { name: "OOP", aliases: ["object-oriented", "oop"], category: "Core CS" },
  // Design
  { name: "Figma", aliases: ["figma"], category: "Design" },
  { name: "UI Design", aliases: ["ui design", "visual design"], category: "Design" },
  { name: "UX", aliases: ["user experience", "ux"], category: "Design" },
  { name: "Responsive Design", aliases: ["responsive design", "responsive"], category: "Design" },
  // Workplace
  { name: "Communication", aliases: ["communication"], category: "Workplace" },
  { name: "Teamwork", aliases: ["cross-functional", "collaboration", "teamwork"], category: "Workplace" },
  { name: "Agile / Scrum", aliases: ["kanban", "scrum", "agile"], category: "Workplace" },
  { name: "Problem Solving", aliases: ["problem-solving", "problem solving"], category: "Workplace" },
  { name: "Leadership", aliases: ["leadership"], category: "Workplace" },
];

const compiled = SKILL_DEFS.map((def) => ({
  def,
  re: new RegExp(`\\b(${def.aliases.map(escapeRe).join("|")})\\b`, "i"),
}));

/** Returns the SkillDefs detected in a piece of text (stable dictionary order). */
export function extractSkillDefs(text: string): SkillDef[] {
  if (!text || !text.trim()) return [];
  return compiled.filter(({ re }) => re.test(text)).map(({ def }) => def);
}

/** Returns just the skill names detected in a piece of text. */
export function extractSkillNames(text: string): string[] {
  return extractSkillDefs(text).map((d) => d.name);
}

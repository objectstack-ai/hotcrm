/**
 * Package Dependency Graph
 *
 * Defines the dependency relationships between all HotCRM packages
 * and provides utilities for dependency validation and load-order resolution.
 */

export interface PackageNode {
  name: string;
  label: string;
  loadOrder: number;
  dependencies: string[];
  seedFiles: string[];
}

/**
 * Complete dependency graph for all 14 HotCRM packages.
 * Load order is determined by topological sort of dependencies.
 */
export const PACKAGE_DEPENDENCY_GRAPH: PackageNode[] = [
  { name: 'core', label: 'Core', loadOrder: 1, dependencies: [], seedFiles: ['system.seed.ts'] },
  { name: 'crm', label: 'Sales Cloud', loadOrder: 2, dependencies: ['core'], seedFiles: ['account.seed.ts', 'contact.seed.ts', 'lead.seed.ts', 'opportunity.seed.ts', 'industry.seed.ts'] },
  { name: 'finance', label: 'Revenue Cloud', loadOrder: 3, dependencies: ['core', 'crm'], seedFiles: ['currency.seed.ts', 'invoice.seed.ts', 'payment.seed.ts'] },
  { name: 'products', label: 'CPQ Cloud', loadOrder: 4, dependencies: ['core'], seedFiles: ['product.seed.ts', 'price_book.seed.ts'] },
  { name: 'hr', label: 'Human Capital', loadOrder: 5, dependencies: ['core'], seedFiles: ['employee.seed.ts', 'department.seed.ts', 'job_posting.seed.ts'] },
  { name: 'support', label: 'Service Cloud', loadOrder: 6, dependencies: ['core', 'crm'], seedFiles: ['case.seed.ts', 'kb_article.seed.ts'] },
  { name: 'marketing', label: 'Marketing Cloud', loadOrder: 7, dependencies: ['core', 'crm'], seedFiles: ['campaign.seed.ts', 'campaign_type.seed.ts', 'email_template.seed.ts'] },
  { name: 'analytics', label: 'Analytics Cloud', loadOrder: 8, dependencies: ['core'], seedFiles: ['report.seed.ts'] },
  { name: 'integration', label: 'Integration Cloud', loadOrder: 9, dependencies: ['core'], seedFiles: ['connection.seed.ts'] },
  { name: 'community', label: 'Community Cloud', loadOrder: 10, dependencies: ['core'], seedFiles: ['idea.seed.ts', 'topic.seed.ts'] },
  { name: 'healthcare', label: 'Healthcare', loadOrder: 11, dependencies: ['core', 'crm'], seedFiles: ['patient.seed.ts', 'appointment.seed.ts', 'insurance.seed.ts', 'prescription.seed.ts'] },
  { name: 'financial-services', label: 'Financial Services', loadOrder: 12, dependencies: ['core', 'crm', 'finance'], seedFiles: ['wealth_account.seed.ts', 'portfolio.seed.ts', 'advisory.seed.ts', 'kyc.seed.ts'] },
  { name: 'real-estate', label: 'Real Estate', loadOrder: 13, dependencies: ['core', 'crm'], seedFiles: ['property.seed.ts', 'listing.seed.ts', 'showing.seed.ts', 'real_estate_offer.seed.ts'] },
  { name: 'education', label: 'Education', loadOrder: 14, dependencies: ['core'], seedFiles: ['course.seed.ts', 'student.seed.ts', 'enrollment.seed.ts', 'scholarship.seed.ts'] },
];

/**
 * Validates that all dependencies in the graph are satisfied
 * (i.e., every dependency points to an existing package).
 */
export function validateDependencies(): { valid: boolean; errors: string[] } {
  const packageNames = new Set(PACKAGE_DEPENDENCY_GRAPH.map(p => p.name));
  const errors: string[] = [];

  for (const pkg of PACKAGE_DEPENDENCY_GRAPH) {
    for (const dep of pkg.dependencies) {
      if (!packageNames.has(dep)) {
        errors.push(`Package "${pkg.name}" depends on unknown package "${dep}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Returns the load order respecting dependencies (topological sort).
 * Verifies no circular dependencies exist.
 */
export function getLoadOrder(): string[] {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const pkg of PACKAGE_DEPENDENCY_GRAPH) {
    graph.set(pkg.name, pkg.dependencies);
    inDegree.set(pkg.name, pkg.dependencies.length);
  }

  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);

    for (const [name, deps] of graph) {
      if (deps.includes(current)) {
        const newDegree = (inDegree.get(name) || 0) - 1;
        inDegree.set(name, newDegree);
        if (newDegree === 0) queue.push(name);
      }
    }
  }

  return order;
}

/**
 * Checks for circular dependencies in the package graph.
 */
export function hasCircularDependency(): boolean {
  return getLoadOrder().length !== PACKAGE_DEPENDENCY_GRAPH.length;
}

/**
 * Gets the total number of seed files across all packages.
 */
export function getTotalSeedFileCount(): number {
  return PACKAGE_DEPENDENCY_GRAPH.reduce((sum, pkg) => sum + pkg.seedFiles.length, 0);
}

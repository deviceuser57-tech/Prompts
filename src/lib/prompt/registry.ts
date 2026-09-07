/* ============================================================================
 * PROMPT REGISTRY
 * ============================================================================
 * Central repository for managing prompt assets, versions, and lifecycle.
 * 
 * Key principles:
 * - Prompts are enterprise assets, not ephemeral text
 * - Every change creates a new version (immutable history)
 * - Every version is linked to test results and audit trail
 * - Local-first with optional Supabase sync
 * ============================================================================ */

import type { PromptSpecification, LifecycleState, ReadinessState } from "./specification";

/* ============================================================================
 * TYPES
 * ============================================================================ */

export interface PromptAsset {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  domain?: string;
  tags: string[];
  currentVersionId?: string;
  status: LifecycleState;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersion {
  id: string;
  assetId: string;
  version: string; // Semantic versioning: "1.2.0"
  parentVersionId?: string;
  
  originalIntent: string;
  specification: PromptSpecification;
  compiledPrompt: string;
  
  authorId?: string;
  changeSummary: string;
  
  validationRunId?: string;
  redTeamRunId?: string;
  testRunId?: string;
  regressionRunId?: string;
  
  readinessScore?: number;
  readinessStatus: ReadinessState;
  
  status: LifecycleState;
  
  createdAt: string;
  publishedAt?: string;
}

export interface AuditEvent {
  id: string;
  assetId?: string;
  versionId?: string;
  action: "create" | "update" | "publish" | "deprecate" | "test" | "evaluate";
  actor: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface CreateAssetRequest {
  name: string;
  description?: string;
  domain?: string;
  tags?: string[];
}

export interface CreateVersionRequest {
  originalIntent: string;
  specification: PromptSpecification;
  compiledPrompt: string;
  changeSummary: string;
  parentVersionId?: string;
}

export interface VersionComparison {
  versionA: PromptVersion;
  versionB: PromptVersion;
  diff: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  metrics?: {
    correctness?: number;
    tokenUsage?: number;
    latency?: number;
  };
}

/* ============================================================================
 * STORAGE
 * ============================================================================ */

const LS_ASSETS = "prompt.assets";
const LS_VERSIONS = "prompt.versions";
const LS_AUDIT = "prompt.audit";

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Failed to write to localStorage:", e);
  }
}

/* ============================================================================
 * REGISTRY IMPLEMENTATION
 * ============================================================================ */

export class PromptRegistry {
  private assets: PromptAsset[];
  private versions: PromptVersion[];
  private auditLog: AuditEvent[];
  
  constructor() {
    this.assets = readLS<PromptAsset[]>(LS_ASSETS, []);
    this.versions = readLS<PromptVersion[]>(LS_VERSIONS, []);
    this.auditLog = readLS<AuditEvent[]>(LS_AUDIT, []);
  }
  
  private persist(): void {
    writeLS(LS_ASSETS, this.assets);
    writeLS(LS_VERSIONS, this.versions);
    writeLS(LS_AUDIT, this.auditLog);
  }
  
  private recordAudit(event: Omit<AuditEvent, "id" | "timestamp">): void {
    this.auditLog.push({
      ...event,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
    });
    this.persist();
  }
  
  /* ========================================================================
   * ASSET OPERATIONS
   * ======================================================================== */
  
  createAsset(request: CreateAssetRequest): PromptAsset {
    const asset: PromptAsset = {
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: request.name,
      description: request.description,
      domain: request.domain,
      tags: request.tags || [],
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.assets.push(asset);
    this.persist();
    
    this.recordAudit({
      assetId: asset.id,
      action: "create",
      actor: "user",
      details: { name: asset.name },
    });
    
    return asset;
  }
  
  getAsset(assetId: string): PromptAsset | undefined {
    return this.assets.find(a => a.id === assetId);
  }
  
  listAssets(): PromptAsset[] {
    return [...this.assets].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
  
  updateAsset(assetId: string, updates: Partial<PromptAsset>): PromptAsset | undefined {
    const asset = this.assets.find(a => a.id === assetId);
    if (!asset) return undefined;
    
    Object.assign(asset, updates, { updatedAt: new Date().toISOString() });
    this.persist();
    
    this.recordAudit({
      assetId,
      action: "update",
      actor: "user",
      details: { updates },
    });
    
    return asset;
  }
  
  deleteAsset(assetId: string): boolean {
    const idx = this.assets.findIndex(a => a.id === assetId);
    if (idx === -1) return false;
    
    this.assets.splice(idx, 1);
    
    // Also delete all versions
    this.versions = this.versions.filter(v => v.assetId !== assetId);
    
    this.persist();
    
    this.recordAudit({
      assetId,
      action: "update",
      actor: "user",
      details: { action: "delete" },
    });
    
    return true;
  }
  
  /* ========================================================================
   * VERSION OPERATIONS
   * ======================================================================== */
  
  createVersion(assetId: string, request: CreateVersionRequest): PromptVersion | undefined {
    const asset = this.assets.find(a => a.id === assetId);
    if (!asset) return undefined;
    
    // Determine version number
    const assetVersions = this.versions.filter(v => v.assetId === assetId);
    const version = this.calculateNextVersion(assetVersions, request.parentVersionId);
    
    const promptVersion: PromptVersion = {
      id: `version-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      assetId,
      version,
      parentVersionId: request.parentVersionId,
      originalIntent: request.originalIntent,
      specification: request.specification,
      compiledPrompt: request.compiledPrompt,
      changeSummary: request.changeSummary,
      readinessStatus: "not_evaluated",
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    
    this.versions.push(promptVersion);
    
    // Update asset's current version
    asset.currentVersionId = promptVersion.id;
    asset.updatedAt = new Date().toISOString();
    
    this.persist();
    
    this.recordAudit({
      assetId,
      versionId: promptVersion.id,
      action: "create",
      actor: "user",
      details: { version, changeSummary: request.changeSummary },
    });
    
    return promptVersion;
  }
  
  getVersion(versionId: string): PromptVersion | undefined {
    return this.versions.find(v => v.id === versionId);
  }
  
  listVersions(assetId: string): PromptVersion[] {
    return this.versions
      .filter(v => v.assetId === assetId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  publishVersion(versionId: string): boolean {
    const version = this.versions.find(v => v.id === versionId);
    if (!version) return false;
    
    // Check readiness
    if (version.readinessStatus === "blocked" || version.readinessStatus === "not_ready") {
      console.warn("Cannot publish version with blocked/not_ready status");
      return false;
    }
    
    version.status = "published";
    version.publishedAt = new Date().toISOString();
    
    // Update asset status
    const asset = this.assets.find(a => a.id === version.assetId);
    if (asset) {
      asset.status = "published";
      asset.currentVersionId = versionId;
      asset.updatedAt = new Date().toISOString();
    }
    
    this.persist();
    
    this.recordAudit({
      assetId: version.assetId,
      versionId,
      action: "publish",
      actor: "user",
      details: { version: version.version },
    });
    
    return true;
  }
  
  deprecateVersion(versionId: string, reason: string): boolean {
    const version = this.versions.find(v => v.id === versionId);
    if (!version) return false;
    
    version.status = "deprecated";
    
    this.persist();
    
    this.recordAudit({
      assetId: version.assetId,
      versionId,
      action: "deprecate",
      actor: "user",
      details: { reason },
    });
    
    return true;
  }
  
  updateVersionReadiness(versionId: string, score: number, status: ReadinessState): boolean {
    const version = this.versions.find(v => v.id === versionId);
    if (!version) return false;
    
    version.readinessScore = score;
    version.readinessStatus = status;
    
    this.persist();
    
    this.recordAudit({
      assetId: version.assetId,
      versionId,
      action: "evaluate",
      actor: "system",
      details: { score, status },
    });
    
    return true;
  }
  
  /* ========================================================================
   * VERSION COMPARISON
   * ======================================================================== */
  
  compareVersions(versionAId: string, versionBId: string): VersionComparison | undefined {
    const versionA = this.versions.find(v => v.id === versionAId);
    const versionB = this.versions.find(v => v.id === versionBId);
    
    if (!versionA || !versionB) return undefined;
    
    // Simple diff based on compiled prompt
    const linesA = versionA.compiledPrompt.split("\n");
    const linesB = versionB.compiledPrompt.split("\n");
    
    const added = linesB.filter(line => !linesA.includes(line));
    const removed = linesA.filter(line => !linesB.includes(line));
    const modified: string[] = []; // Would need more sophisticated diff algorithm
    
    return {
      versionA,
      versionB,
      diff: { added, removed, modified },
    };
  }
  
  /* ========================================================================
   * AUDIT TRAIL
   * ======================================================================== */
  
  getAuditLog(assetId?: string): AuditEvent[] {
    if (assetId) {
      return this.auditLog.filter(e => e.assetId === assetId);
    }
    return [...this.auditLog].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  /* ========================================================================
   * HELPERS
   * ======================================================================== */
  
  private calculateNextVersion(versions: PromptVersion[], parentId?: string): string {
    if (versions.length === 0) return "1.0.0";
    
    // Find the latest version
    const latest = versions.reduce((max, v) => {
      return this.compareSemver(v.version, max.version) > 0 ? v : max;
    });
    
    const [major, minor, patch] = latest.version.split(".").map(Number);
    
    // If parent is specified, increment patch
    if (parentId) {
      return `${major}.${minor}.${patch + 1}`;
    }
    
    // Otherwise, increment minor
    return `${major}.${minor + 1}.0`;
  }
  
  private compareSemver(a: string, b: string): number {
    const [aMajor, aMinor, aPatch] = a.split(".").map(Number);
    const [bMajor, bMinor, bPatch] = b.split(".").map(Number);
    
    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  }
}

/* ============================================================================
 * SINGLETON INSTANCE
 * ============================================================================ */

let registryInstance: PromptRegistry | null = null;

export function getRegistry(): PromptRegistry {
  if (!registryInstance) {
    registryInstance = new PromptRegistry();
  }
  return registryInstance;
}

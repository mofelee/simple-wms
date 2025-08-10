/**
 * GS1 Parser TypeScript Definitions
 * 
 * This module defines TypeScript interfaces and types for parsing and validating
 * GS1 Application Identifiers based on the official GS1 vocabulary.
 */

// ============================================================================
// Core Component Types
// ============================================================================

/**
 * Component data types in GS1 format strings
 */
export type ComponentType = 'N' | 'X';

/**
 * Individual component definition for an Application Identifier
 */
export interface GS1Component {
  /** Whether this component is optional */
  optional: boolean;
  /** Data type - N for numeric, X for alphanumeric */
  type: ComponentType;
  /** Whether the component has a fixed length */
  fixedLength: boolean;
  /** Maximum length of the component */
  length: number;
  /** Whether this component includes a check digit */
  checkDigit?: boolean;
  /** Whether this component is a key identifier */
  key?: boolean;
}

// ============================================================================
// Application Identifier Definition
// ============================================================================

/**
 * Complete definition of a GS1 Application Identifier from the vocabulary
 */
export interface GS1ApplicationIdentifierDef {
  /** The AI code (e.g., "01", "10", "8200") */
  applicationIdentifier: string;
  /** Format string describing the structure (e.g., "N2+N14") */
  formatString: string;
  /** Human-readable description */
  description: string;
  /** Regular expression for validation */
  regex: string;
  /** Additional notes */
  note: string;
  /** Short title/name */
  title: string;
  /** Whether a separator (FNC1) is required after this AI */
  separatorRequired: boolean;
  /** Array of component definitions */
  components: GS1Component[];
  /** Whether this can be a primary key in GS1 Digital Link */
  gs1DigitalLinkPrimaryKey?: boolean;
  /** Qualifier groups for GS1 Digital Link */
  gs1DigitalLinkQualifiers?: string[][];
  /** AIs that this AI requires to be present */
  requires?: string[];
  /** AIs that cannot be used together with this AI */
  excludes?: string[];
  /** Whether this AI can be used as a data attribute */
  validAsDataAttribute?: boolean;
}

// ============================================================================
// Parsed GS1 Data Types
// ============================================================================

/**
 * A parsed GS1 Application Identifier with its value
 */
export interface ParsedGS1Element {
  /** The AI code */
  ai: string;
  /** The parsed value */
  value: string;
  /** Raw value before parsing/validation */
  rawValue: string;
  /** Reference to the AI definition */
  definition: GS1ApplicationIdentifierDef;
  /** Whether the value passed validation */
  isValid: boolean;
  /** Validation error message if any */
  validationError?: string;
}

/**
 * Complete parsed GS1 data structure
 */
export interface ParsedGS1Data {
  /** Array of parsed elements */
  elements: ParsedGS1Element[];
  /** Original raw input string */
  rawInput: string;
  /** Whether the entire parse was successful */
  isValid: boolean;
  /** Any global parsing errors */
  errors: string[];
  /** Primary identifier (usually GTIN, SSCC, etc.) */
  primaryKey?: ParsedGS1Element;
  /** Grouped elements by category */
  groups: {
    /** Identification elements (01, 02, etc.) */
    identification: ParsedGS1Element[];
    /** Date elements (11, 12, 13, 15, 16, 17) */
    dates: ParsedGS1Element[];
    /** Measurement elements (30xx, 31xx, 32xx, 33xx, etc.) */
    measurements: ParsedGS1Element[];
    /** Logistic elements (00, 37, etc.) */
    logistics: ParsedGS1Element[];
    /** Other/miscellaneous elements */
    other: ParsedGS1Element[];
  };
}

// ============================================================================
// GS1 Vocabulary Container
// ============================================================================

/**
 * JSON-LD context for GS1 vocabulary
 */
export interface GS1Context {
  dc: string;
  gs1: string;
  owl: string;
  rdfs: string;
  schema: string;
  voaf: string;
  xsd: string;
  '@base': string;
  applicationIdentifier: string;
  label: string;
  description: string;
  applicationIdentifiers: string;
  id: string;
  a: string;
}

/**
 * Metadata about the GS1 vocabulary
 */
export interface GS1VocabularyMeta {
  id: string;
  a: string[];
  'schema:license': string;
  'dc:creator': { '@id': string };
  'dc:issued:': { '@type': string; '@value': string };
  'dc:lastModified': { '@type': string; '@value': string };
  'owl:versionInfo': string;
  'dc:contributors': string;
}

/**
 * Complete GS1 vocabulary data structure
 */
export interface GS1Vocabulary {
  '@context': GS1Context;
  applicationIdentifiers: (GS1VocabularyMeta | GS1ApplicationIdentifierDef)[];
}

// ============================================================================
// Parser Configuration and Options
// ============================================================================

/**
 * Configuration options for the GS1 parser
 */
export interface GS1ParserOptions {
  /** Whether to perform strict validation */
  strict?: boolean;
  /** Whether to group elements by category */
  groupElements?: boolean;
  /** Custom AI definitions to supplement the standard vocabulary */
  customAIs?: Map<string, GS1ApplicationIdentifierDef>;
  /** Whether to validate check digits */
  validateCheckDigits?: boolean;
  /** Whether to resolve AI dependencies */
  resolveDependencies?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result type for validation operations
 */
export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Common GS1 AI categories for grouping
 */
export enum GS1Category {
  IDENTIFICATION = 'identification',
  DATES = 'dates',
  MEASUREMENTS = 'measurements',
  LOGISTICS = 'logistics',
  OTHER = 'other'
}

/**
 * Type guard for checking if an object is a GS1 Application Identifier definition
 */
export function isGS1ApplicationIdentifierDef(obj: any): obj is GS1ApplicationIdentifierDef {
  return obj && 
    typeof obj.applicationIdentifier === 'string' &&
    typeof obj.formatString === 'string' &&
    typeof obj.description === 'string' &&
    Array.isArray(obj.components);
}

/**
 * Type guard for checking if an object is vocabulary metadata
 */
export function isGS1VocabularyMeta(obj: any): obj is GS1VocabularyMeta {
  return obj && 
    typeof obj.id === 'string' &&
    Array.isArray(obj.a) &&
    !obj.hasOwnProperty('applicationIdentifier');
}

// ============================================================================
// Utility Functions and Classes
// ============================================================================

/**
 * GS1 Parser utility class for working with GS1 data
 */
export class GS1Parser {
  private aiDefinitions: Map<string, GS1ApplicationIdentifierDef>;
  private options: GS1ParserOptions;

  constructor(vocabulary: GS1Vocabulary, options: GS1ParserOptions = {}) {
    this.options = {
      strict: true,
      groupElements: true,
      validateCheckDigits: true,
      resolveDependencies: true,
      ...options
    };

    // Build AI definitions map
    this.aiDefinitions = new Map();
    vocabulary.applicationIdentifiers.forEach(item => {
      if (isGS1ApplicationIdentifierDef(item)) {
        this.aiDefinitions.set(item.applicationIdentifier, item);
      }
    });

    // Add custom AIs if provided
    if (this.options.customAIs) {
      this.options.customAIs.forEach((def, ai) => {
        this.aiDefinitions.set(ai, def);
      });
    }
  }

  /**
   * Get AI definition by code
   */
  getAIDefinition(ai: string): GS1ApplicationIdentifierDef | undefined {
    return this.aiDefinitions.get(ai);
  }

  /**
   * Get all available AI codes
   */
  getAvailableAIs(): string[] {
    return Array.from(this.aiDefinitions.keys()).sort();
  }

  /**
   * Search AI definitions by title or description
   */
  searchAIs(query: string): GS1ApplicationIdentifierDef[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.aiDefinitions.values()).filter(ai => 
      ai.title.toLowerCase().includes(lowerQuery) ||
      ai.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Validate an AI value against its definition
   */
  validateAIValue(ai: string, value: string): ValidationResult {
    const definition = this.aiDefinitions.get(ai);
    if (!definition) {
      return { valid: false, errors: [`Unknown AI: ${ai}`] };
    }

    const errors: string[] = [];

    // Test against regex
    const regex = new RegExp(`^${definition.regex}$`);
    if (!regex.test(value)) {
      errors.push(`Value "${value}" does not match pattern for AI ${ai}`);
    }

    // Check length constraints
    let totalLength = 0;
    definition.components.forEach(comp => {
      if (comp.fixedLength) {
        totalLength += comp.length;
      }
    });

    if (definition.components.some(c => c.fixedLength) && value.length !== totalLength) {
      errors.push(`Value length ${value.length} does not match expected ${totalLength} for AI ${ai}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Group elements by category
   */
  groupElements(elements: ParsedGS1Element[]): ParsedGS1Data['groups'] {
    const groups: ParsedGS1Data['groups'] = {
      identification: [],
      dates: [],
      measurements: [],
      logistics: [],
      other: []
    };

    elements.forEach(element => {
      const ai = element.ai;
      
      // Identification AIs (01, 02, 03, 8006, 8026, etc.)
      if (['01', '02', '03', '8006', '8026', '8200'].includes(ai) || ai.startsWith('24')) {
        groups.identification.push(element);
      }
      // Date AIs (11, 12, 13, 15, 16, 17)
      else if (['11', '12', '13', '15', '16', '17'].includes(ai)) {
        groups.dates.push(element);
      }
      // Measurement AIs (30xx, 31xx, 32xx, 33xx, 35xx, 36xx)
      else if (ai.match(/^3[0-6]/)) {
        groups.measurements.push(element);
      }
      // Logistics AIs (00, 37, 400x, 401x, 402x, 403x, 8001-8020)
      else if (['00', '37'].includes(ai) || ai.match(/^40[0-3]/) || (ai >= '8001' && ai <= '8020')) {
        groups.logistics.push(element);
      }
      // Everything else
      else {
        groups.other.push(element);
      }
    });

    return groups;
  }

  /**
   * Find the primary key element (GTIN, SSCC, etc.)
   */
  findPrimaryKey(elements: ParsedGS1Element[]): ParsedGS1Element | undefined {
    return elements.find(el => el.definition.gs1DigitalLinkPrimaryKey);
  }

  /**
   * Check AI dependencies and exclusions
   */
  validateDependencies(elements: ParsedGS1Element[]): ValidationResult {
    const errors: string[] = [];
    const presentAIs = new Set(elements.map(el => el.ai));

    elements.forEach(element => {
      const def = element.definition;

      // Check required AIs (oneOf relationship - at least one must be present)
      if (def.requires && def.requires.length > 0) {
        const hasAnyRequired = def.requires.some(requiredAI => presentAIs.has(requiredAI));
        if (!hasAnyRequired) {
          if (def.requires.length === 1) {
            errors.push(`AI ${element.ai} requires AI ${def.requires[0]} to be present`);
          } else {
            errors.push(`AI ${element.ai} requires at least one of these AIs to be present: ${def.requires.join(', ')}`);
          }
        }
      }

      // Check excluded AIs
      if (def.excludes) {
        def.excludes.forEach(excludedAI => {
          if (presentAIs.has(excludedAI)) {
            errors.push(`AI ${element.ai} cannot be used together with AI ${excludedAI}`);
          }
        });
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get statistics about the loaded vocabulary
   */
  getStatistics(): {
    totalAIs: number;
    categoryCounts: Record<GS1Category, number>;
    primaryKeys: number;
    withDependencies: number;
    withExclusions: number;
  } {
    const ais = Array.from(this.aiDefinitions.values());
    const mockElements = ais.map(ai => ({ ai: ai.applicationIdentifier, definition: ai } as ParsedGS1Element));
    const groups = this.groupElements(mockElements);

    return {
      totalAIs: ais.length,
      categoryCounts: {
        [GS1Category.IDENTIFICATION]: groups.identification.length,
        [GS1Category.DATES]: groups.dates.length,
        [GS1Category.MEASUREMENTS]: groups.measurements.length,
        [GS1Category.LOGISTICS]: groups.logistics.length,
        [GS1Category.OTHER]: groups.other.length
      },
      primaryKeys: ais.filter(ai => ai.gs1DigitalLinkPrimaryKey).length,
      withDependencies: ais.filter(ai => ai.requires && ai.requires.length > 0).length,
      withExclusions: ais.filter(ai => ai.excludes && ai.excludes.length > 0).length
    };
  }
}

/**
 * Load GS1 vocabulary from JSON data
 */
export function loadGS1Vocabulary(jsonData: any): GS1Vocabulary {
  if (!jsonData['@context'] || !Array.isArray(jsonData.applicationIdentifiers)) {
    throw new Error('Invalid GS1 vocabulary format');
  }
  return jsonData as GS1Vocabulary;
}

/**
 * Create a new GS1 parser instance from JSON vocabulary
 */
export function createGS1Parser(vocabularyJson: any, options?: GS1ParserOptions): GS1Parser {
  const vocabulary = loadGS1Vocabulary(vocabularyJson);
  return new GS1Parser(vocabulary, options);
}

// ============================================================================
// GS1 Parsing Functions
// ============================================================================

/**
 * Raw parsing result without validation
 */
export interface RawGS1ParseResult {
  /** Array of raw AI-value pairs */
  elements: Array<{ ai: string; value: string; rawValue: string }>;
  /** Original input string */
  rawInput: string;
  /** Parsing success status */
  success: boolean;
  /** Parsing errors (format errors, not validation errors) */
  errors: string[];
  /** Detected format type */
  formatType: 'gs1' | 'parentheses' | 'unknown';
}

/**
 * Common AI fixed lengths mapping for proper GS separator parsing
 * This is a subset of the most common fixed-length AIs
 */
const AI_FIXED_LENGTHS: Record<string, number> = {
  // GTIN family - 14 digits
  '01': 14, // GTIN
  '02': 14, // GTIN of contained items
  '03': 14, // MtO GTIN
  
  // Date fields - 6 digits (YYMMDD)
  '11': 6,  // Production date
  '12': 6,  // Due date
  '13': 6,  // Packaging date
  '15': 6,  // Best before date
  '16': 6,  // Sell by date
  '17': 6,  // Expiration date
  
  // Serial references - 18 digits
  '00': 18, // SSCC
  
  // Weight/Measure (6 digits for the number part)
  // Note: These are actually more complex, but for now we'll handle them as variable
};

/**
 * Get the fixed length for an AI value based on the AI code
 * Returns null if the AI has variable length
 * 
 * @param ai - Application Identifier code
 * @returns Fixed length or null for variable length
 */
function getAIFixedLength(ai: string): number | null {
  return AI_FIXED_LENGTHS[ai] || null;
}

/**
 * Parse GS1 data separated by GS (0x1D) characters
 * Format: AI1<value1><GS>AI2<value2><GS>...
 * 
 * @param input - Input string with GS separators
 * @returns Raw parsing result without validation
 */
export function parseGS1WithGSSeparator(input: string): RawGS1ParseResult {
  const result: RawGS1ParseResult = {
    elements: [],
    rawInput: input,
    success: false,
    errors: [],
    formatType: 'gs1'
  };

  if (!input || input.length === 0) {
    result.errors.push('Empty input string');
    return result;
  }

  try {
    let position = 0;
    
    while (position < input.length) {
      // Skip GS characters
      if (input[position] === '\x1D') {
        position++;
        continue;
      }
      
      // Try to identify AI (2-4 digits)
      let ai = '';
      let aiLength = 0;
      
      // Try different AI lengths (2, 3, 4 digits)
      for (let len = 2; len <= 4 && position + len <= input.length; len++) {
        const candidateAI = input.substring(position, position + len);
        if (/^\d+$/.test(candidateAI)) {
          // Check if this AI pattern makes sense
          if (len === 2 || 
              (len === 3 && /^(24[0-9]|25[0-5])$/.test(candidateAI)) ||
              (len === 4 && /^(40[0-9][0-9]|41[0-9][0-9]|42[0-9][0-9]|43[0-9][0-9]|80[0-9][0-9]|82[0-9][0-9]|90[0-9][0-9]|91[0-9][0-9])$/.test(candidateAI))) {
            ai = candidateAI;
            aiLength = len;
          }
        }
      }
      
      if (!ai) {
        result.errors.push(`Could not identify AI at position ${position}`);
        break;
      }
      
      position += aiLength;
      
      // Now extract the value based on AI type
      const fixedLength = getAIFixedLength(ai);
      let value = '';
      
      if (fixedLength !== null) {
        // Fixed length AI - extract exactly the specified number of characters
        if (position + fixedLength > input.length) {
          result.errors.push(`Not enough characters for AI ${ai} (expected ${fixedLength}, remaining ${input.length - position})`);
          break;
        }
        value = input.substring(position, position + fixedLength);
        position += fixedLength;
      } else {
        // Variable length AI - extract until next GS or end of input
        let nextGS = input.indexOf('\x1D', position);
        if (nextGS === -1) {
          // No GS found, take rest of input
          value = input.substring(position);
          position = input.length;
        } else {
          value = input.substring(position, nextGS);
          position = nextGS; // Will be advanced past GS in next iteration
        }
      }
      
      if (value.length === 0) {
        result.errors.push(`Empty value for AI ${ai}`);
        continue;
      }
      
      result.elements.push({
        ai,
        value,
        rawValue: `${ai}${value}`
      });
    }
    
    if (result.elements.length === 0) {
      result.errors.push('No valid AI segments found');
    }
    
    result.success = result.elements.length > 0 && result.errors.length === 0;
  } catch (error) {
    result.errors.push(`Parsing error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Parse GS1 data with parentheses format
 * Format: (AI1)value1(AI2)value2...
 * 
 * @param input - Input string with parentheses format
 * @returns Raw parsing result without validation
 */
export function parseGS1WithParentheses(input: string): RawGS1ParseResult {
  const result: RawGS1ParseResult = {
    elements: [],
    rawInput: input,
    success: false,
    errors: [],
    formatType: 'parentheses'
  };

  if (!input || input.length === 0) {
    result.errors.push('Empty input string');
    return result;
  }

  try {
    // Regular expression to match (AI)value patterns
    const regex = /\((\d{2,4})\)([^(]*?)(?=\(|$)/g;
    let match;
    
    while ((match = regex.exec(input)) !== null) {
      const ai = match[1];
      const value = match[2] || '';
      
      if (ai) {
        result.elements.push({
          ai,
          value,
          rawValue: `(${ai})${value}`
        });
      }
    }
    
    if (result.elements.length === 0) {
      result.errors.push('No valid (AI)value patterns found');
    } else {
      // Check if we parsed the entire input
      const reconstructed = result.elements.map(el => el.rawValue).join('');
      if (reconstructed !== input) {
        result.errors.push('Input contains unparseable segments');
      }
    }
    
    result.success = result.elements.length > 0 && result.errors.length === 0;
  } catch (error) {
    result.errors.push(`Parsing error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Automatically detect format and parse GS1 data
 * 
 * @param input - Input string in either format
 * @returns Raw parsing result without validation
 */
export function parseGS1Auto(input: string): RawGS1ParseResult {
  if (!input || input.length === 0) {
    return {
      elements: [],
      rawInput: input,
      success: false,
      errors: ['Empty input string'],
      formatType: 'unknown'
    };
  }

  // First, try to detect the format
  const hasParentheses = /\(\d{2,4}\)/.test(input);
  const hasGSCharacter = input.includes('\x1D');
  
  if (hasParentheses && !hasGSCharacter) {
    // Likely parentheses format
    return parseGS1WithParentheses(input);
  } else if (hasGSCharacter && !hasParentheses) {
    // Likely GS separator format
    return parseGS1WithGSSeparator(input);
  } else if (hasParentheses && hasGSCharacter) {
    // Mixed format - try both and return the one with better results
    const parenthesesResult = parseGS1WithParentheses(input);
    const gsResult = parseGS1WithGSSeparator(input);
    
    // Return the one with more successful elements and fewer errors
    if (parenthesesResult.elements.length > gsResult.elements.length) {
      return parenthesesResult;
    } else if (gsResult.elements.length > parenthesesResult.elements.length) {
      return gsResult;
    } else {
      // Same number of elements, prefer the one with fewer errors
      return parenthesesResult.errors.length <= gsResult.errors.length 
        ? parenthesesResult 
        : gsResult;
    }
  } else {
    // Try both formats and see which one works better
    const parenthesesResult = parseGS1WithParentheses(input);
    const gsResult = parseGS1WithGSSeparator(input);
    
    if (parenthesesResult.success) {
      return parenthesesResult;
    } else if (gsResult.success) {
      return gsResult;
    } else {
      // Neither format worked well, return the one with more elements
      const betterResult = parenthesesResult.elements.length >= gsResult.elements.length 
        ? parenthesesResult 
        : gsResult;
      
      betterResult.formatType = 'unknown';
      betterResult.errors.push('Could not reliably detect input format');
      return betterResult;
    }
  }
}

// ============================================================================
// Strict Validation Wrapper Functions
// ============================================================================

/**
 * Parse GS1 data with GS separators and strict validation
 * 
 * @param input - Input string with GS separators
 * @param parser - GS1Parser instance for validation
 * @returns Fully validated ParsedGS1Data
 */
export function parseGS1WithGSSeparatorStrict(input: string, parser: GS1Parser): ParsedGS1Data {
  const rawResult = parseGS1WithGSSeparator(input);
  return validateAndEnrichParsedData(rawResult, parser);
}

/**
 * Parse GS1 data with parentheses format and strict validation
 * 
 * @param input - Input string with parentheses format
 * @param parser - GS1Parser instance for validation
 * @returns Fully validated ParsedGS1Data
 */
export function parseGS1WithParenthesesStrict(input: string, parser: GS1Parser): ParsedGS1Data {
  const rawResult = parseGS1WithParentheses(input);
  return validateAndEnrichParsedData(rawResult, parser);
}

/**
 * Automatically detect format, parse, and validate GS1 data
 * 
 * @param input - Input string in either format
 * @param parser - GS1Parser instance for validation
 * @returns Fully validated ParsedGS1Data
 */
export function parseGS1AutoStrict(input: string, parser: GS1Parser): ParsedGS1Data {
  const rawResult = parseGS1Auto(input);
  return validateAndEnrichParsedData(rawResult, parser);
}

/**
 * Convert raw parsing result to validated ParsedGS1Data
 * 
 * @param rawResult - Raw parsing result
 * @param parser - GS1Parser instance for validation
 * @returns Fully validated ParsedGS1Data
 */
function validateAndEnrichParsedData(rawResult: RawGS1ParseResult, parser: GS1Parser): ParsedGS1Data {
  const validatedElements: ParsedGS1Element[] = [];
  const globalErrors: string[] = [...rawResult.errors];

  // Process each raw element
  for (const rawElement of rawResult.elements) {
    const definition = parser.getAIDefinition(rawElement.ai);
    
    if (!definition) {
      globalErrors.push(`Unknown AI: ${rawElement.ai}`);
      continue;
    }

    // Validate the value
    const validation = parser.validateAIValue(rawElement.ai, rawElement.value);
    
    const validatedElement: ParsedGS1Element = {
      ai: rawElement.ai,
      value: rawElement.value,
      rawValue: rawElement.rawValue,
      definition,
      isValid: validation.valid,
      validationError: validation.valid ? undefined : validation.errors.join('; ')
    };

    validatedElements.push(validatedElement);
    
    if (!validation.valid) {
      globalErrors.push(`AI ${rawElement.ai}: ${validation.errors.join('; ')}`);
    }
  }

  // Check dependencies if enabled
  if (parser['options'].resolveDependencies) {
    const dependencyValidation = parser.validateDependencies(validatedElements);
    if (!dependencyValidation.valid) {
      globalErrors.push(...dependencyValidation.errors);
    }
  }

  // Group elements if enabled
  const groups = parser['options'].groupElements 
    ? parser.groupElements(validatedElements)
    : {
        identification: [],
        dates: [],
        measurements: [],
        logistics: [],
        other: []
      };

  // Find primary key
  const primaryKey = parser.findPrimaryKey(validatedElements);

  return {
    elements: validatedElements,
    rawInput: rawResult.rawInput,
    isValid: rawResult.success && globalErrors.length === 0 && validatedElements.every(el => el.isValid),
    errors: globalErrors,
    primaryKey,
    groups
  };
}

// ============================================================================
// All types are already exported above with their definitions
// ============================================================================

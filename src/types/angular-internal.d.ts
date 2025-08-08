// Fix for Angular internal API type errors
// This file provides type declarations for Angular's internal APIs
// to prevent TypeScript compilation errors
declare global {
  namespace ng {
    function ɵassertType<T>(value: T): T;
    function ɵɵdefineComponent(options: Record<string, unknown>): unknown;
    function ɵɵdefineDirective(options: Record<string, unknown>): unknown;
    function ɵɵdirectiveInject(token: unknown, flags?: unknown): unknown;
  }
}

// Export empty object to make this a module
export {};

interface AnalysisResult {
    analysis: string;
    data?: unknown;
    sqlExecuted?: string;
    suggestions?: string[];
}
export declare function analyzeWithClaude(userQuery: string, context?: string): Promise<AnalysisResult>;
export declare function generateReport(reportType: 'daily' | 'weekly' | 'monthly', targetDate?: string): Promise<AnalysisResult>;
export declare function predictResources(targetDate: string, district?: string): Promise<AnalysisResult>;
export declare function optimizeResponseTimes(districtId?: string): Promise<AnalysisResult>;
export {};
//# sourceMappingURL=claude-service.d.ts.map
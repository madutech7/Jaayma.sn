import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const SUMMARY_METRICS = [
  'activeUsers',
  'newUsers',
  'sessions',
  'screenPageViews',
  'engagedSessions',
  'engagementRate',
  'averageSessionDuration',
  'eventCount',
  'ecommercePurchases',
  'purchaseRevenue',
] as const;

type ReportRow = {
  dimensionValues?: Array<{ value?: string | null }> | null;
  metricValues?: Array<{ value?: string | null }> | null;
};

type ServiceAccountCredentials = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

type DashboardSummary = {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  pageViews: number;
  engagedSessions: number;
  engagementRate: number;
  averageSessionDuration: number;
  eventCount: number;
  purchases: number;
  revenue: number;
};

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private client: BetaAnalyticsDataClient | null = null;
  private propertyId = '';

  constructor(private readonly config: ConfigService) {}

  async getDashboard(days: number) {
    const setup = this.getConfiguration();
    if (!setup.configured) {
      return {
        status: 'setup_required' as const,
        propertyId: setup.propertyId || null,
        missing: setup.missing,
        rangeDays: days,
      };
    }

    try {
      const client = this.getClient(setup.propertyId, setup.credentials);
      const property = `properties/${setup.propertyId}`;
      const [mainBatch] = await client.batchRunReports({
        property,
        requests: [
          { dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }], metrics: SUMMARY_METRICS.map((name) => ({ name })) },
          { dateRanges: [{ startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo` }], metrics: SUMMARY_METRICS.map((name) => ({ name })) },
          {
            dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
            dimensions: [{ name: 'date' }],
            metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
            orderBys: [{ dimension: { dimensionName: 'date' } }],
          },
          {
            dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
            dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
            metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
            orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
            limit: 10,
          },
          {
            dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 8,
          },
        ],
      });

      const [detailBatch] = await client.batchRunReports({
        property,
        requests: [
          {
            dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
            dimensions: [{ name: 'country' }],
            metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
            orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
            limit: 8,
          },
          {
            dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
            dimensions: [{ name: 'deviceCategory' }],
            metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
            orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
            limit: 5,
          },
          {
            dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
            dimensions: [{ name: 'eventName' }],
            metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
            orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
            limit: 12,
          },
          {
            dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
            dimensions: [{ name: 'landingPage' }],
            metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 8,
          },
          {
            dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
            dimensions: [{ name: 'itemName' }],
            metrics: [
              { name: 'itemViewEvents' },
              { name: 'itemsAddedToCart' },
              { name: 'itemsPurchased' },
              { name: 'itemRevenue' },
            ],
            orderBys: [{ metric: { metricName: 'itemViewEvents' }, desc: true }],
            limit: 8,
          },
        ],
      });

      const [realtimeResponse] = await client.runRealtimeReport({
        property,
        metrics: [{ name: 'activeUsers' }],
      });
      const reports = mainBatch.reports ?? [];
      const detailReports = detailBatch.reports ?? [];
      const current = this.toSummary(reports[0]?.rows?.[0] ?? reports[0]?.totals?.[0]);
      const previous = this.toSummary(reports[1]?.rows?.[0] ?? reports[1]?.totals?.[0]);

      return {
        status: 'ready' as const,
        propertyId: setup.propertyId,
        rangeDays: days,
        generatedAt: new Date().toISOString(),
        realtimeUsers: this.metric(realtimeResponse.rows?.[0] ?? realtimeResponse.totals?.[0], 0),
        current,
        previous,
        trend: (reports[2]?.rows ?? []).map((row) => ({
          date: this.normalizeDate(this.dimension(row, 0)),
          activeUsers: this.metric(row, 0),
          sessions: this.metric(row, 1),
        })),
        topPages: this.rows(reports[3]?.rows, (row) => ({
          path: this.dimension(row, 0),
          title: this.dimension(row, 1),
          views: this.metric(row, 0),
          users: this.metric(row, 1),
        })),
        channels: this.rows(reports[4]?.rows, (row) => ({
          name: this.dimension(row, 0),
          sessions: this.metric(row, 0),
          users: this.metric(row, 1),
        })),
        countries: this.rows(detailReports[0]?.rows, (row) => ({
          name: this.dimension(row, 0),
          users: this.metric(row, 0),
          sessions: this.metric(row, 1),
        })),
        devices: this.rows(detailReports[1]?.rows, (row) => ({
          name: this.dimension(row, 0),
          users: this.metric(row, 0),
          sessions: this.metric(row, 1),
        })),
        events: this.rows(detailReports[2]?.rows, (row) => ({
          name: this.dimension(row, 0),
          count: this.metric(row, 0),
          users: this.metric(row, 1),
        })),
        landingPages: this.rows(detailReports[3]?.rows, (row) => ({
          path: this.dimension(row, 0),
          sessions: this.metric(row, 0),
          users: this.metric(row, 1),
        })),
        products: this.rows(detailReports[4]?.rows, (row) => ({
          name: this.dimension(row, 0),
          views: this.metric(row, 0),
          addedToCart: this.metric(row, 1),
          purchases: this.metric(row, 2),
          revenue: this.metric(row, 3),
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const safeMessage = message
        .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/gi, '[REDACTED PRIVATE KEY]')
        .replace(/("private_key"\s*:\s*")[^"]*(")/gi, '$1[REDACTED]$2')
        .slice(0, 600);
      this.logger.error(`GA4 report request failed for property ${setup.propertyId}: ${safeMessage || 'Unknown error'}`);
      const isAccessError = /permission|denied|403|unauthenticated|credential/i.test(message);
      return {
        status: 'connection_error' as const,
        propertyId: setup.propertyId,
        rangeDays: days,
        message: isAccessError
          ? 'Google Analytics refuse l’accès. Vérifiez que l’API Google Analytics Data est activée et que le compte de service a le rôle Lecteur sur cette propriété GA4.'
          : 'Impossible de récupérer les rapports GA4 pour le moment. Vérifiez la configuration et réessayez.',
      };
    }
  }

  private getConfiguration() {
    const propertyId = this.config.get<string>('GA_PROPERTY_ID')?.trim() ?? '';
    const credentialsRaw = this.config.get<string>('GA_SERVICE_ACCOUNT_JSON') ?? '';
    const missing: string[] = [];
    if (!/^\d+$/.test(propertyId)) missing.push('GA_PROPERTY_ID');

    let credentials: ServiceAccountCredentials | null = null;
    if (credentialsRaw) {
      try {
        const parsed = JSON.parse(credentialsRaw) as ServiceAccountCredentials;
        if (parsed?.client_email && parsed.private_key) credentials = parsed;
      } catch {
        // Invalid JSON is treated as a missing server-side credential.
      }
    }
    if (!credentials) missing.push('GA_SERVICE_ACCOUNT_JSON');

    return { configured: missing.length === 0, propertyId, credentials, missing };
  }

  private getClient(
    propertyId: string,
    credentials: ServiceAccountCredentials | null,
  ) {
    if (!credentials) throw new Error('Analytics credentials are missing.');
    if (this.client && this.propertyId === propertyId) return this.client;

    this.client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      projectId: credentials.project_id,
    });
    this.propertyId = propertyId;
    return this.client;
  }

  private toSummary(row?: ReportRow): DashboardSummary {
    return {
      activeUsers: this.metric(row, 0),
      newUsers: this.metric(row, 1),
      sessions: this.metric(row, 2),
      pageViews: this.metric(row, 3),
      engagedSessions: this.metric(row, 4),
      engagementRate: this.metric(row, 5),
      averageSessionDuration: this.metric(row, 6),
      eventCount: this.metric(row, 7),
      purchases: this.metric(row, 8),
      revenue: this.metric(row, 9),
    };
  }

  private rows<T>(rows: ReportRow[] | null | undefined, map: (row: ReportRow) => T) {
    return (rows ?? []).map(map).filter((row) => {
      const values = Object.values(row as Record<string, unknown>);
      return values[0] !== '(not set)' && values[0] !== '';
    });
  }

  private dimension(row: ReportRow | undefined, index: number) {
    return row?.dimensionValues?.[index]?.value ?? '';
  }

  private metric(row: ReportRow | undefined, index: number) {
    const value = Number(row?.metricValues?.[index]?.value ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  private normalizeDate(date: string) {
    return /^\d{8}$/.test(date) ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}` : date;
  }
}

export interface CampState {
  archives?: {
    monthKey: string;
    spent: number;
    firstWin: boolean;
    dungeonWins?: string[];
    advancedWins?: string[];
    nodes: Record<string, number>;
    days: string[];
    gems: Record<string, number>;
    battles: number;
    skills: string[];
  }[];
  version: 1;
  memoryVersion?: string;
  memoryMigration?: {
    previousNodes: Record<string, number>;
    previousSupports: Record<string, string[]>;
    refundedExp: number;
  };
  monthKey: string;
  startedAt: number;
  purchasedNodes: Record<string, number>;
  skills: Record<string, Record<string, Record<string, number>>>;
  subjobUnlocks: Record<string, string[]>;
  equippedSubjobs: Record<string, string>;
  supports: Record<string, string[]>;
  party: string[];
  backpack?: Record<string, number>;
  /** 本周目已结算购物实付古币；旧档从0开始，不从余额推算。 */
  shopSpent?: number;
  gemEquipment?: Record<string, Record<string, string>>;
  certificatePurchases: Record<string, number>;
  claimState: {
    days: string[];
    mornings: string[];
    lastSupply: number;
    latestTime: number;
  };
  migrationNotice: boolean;
}

import { db } from './firebase-admin';
import { UserProfile, DocumentGeneration, Purchase, UserAnalytics, SystemStats } from './firestore-models';

export class AdminService {
  // Obtener todos los usuarios
  static async getAllUsers(): Promise<UserProfile[]> {
    try {
      const snapshot = await db().collection('users').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  // Obtener usuario específico
  static async getUserById(uid: string): Promise<UserProfile | null> {
    try {
      const doc = await db().collection('users').doc(uid).get();
      if (!doc.exists) return null;
      return { uid: doc.id, ...doc.data() } as UserProfile;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  // Obtener generaciones de un usuario
  static async getUserGenerations(uid: string, limit: number = 50): Promise<DocumentGeneration[]> {
    try {
      const snapshot = await db()
        .collection('documents')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentGeneration));
    } catch (error) {
      console.error('Error getting user generations:', error);
      return [];
    }
  }

  // Obtener compras de un usuario
  static async getUserPurchases(uid: string, limit: number = 50): Promise<Purchase[]> {
    try {
      const snapshot = await db()
        .collection('purchases')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase));
    } catch (error) {
      console.error('Error getting user purchases:', error);
      return [];
    }
  }

  // Obtener analytics de un usuario
  static async getUserAnalytics(uid: string, period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<UserAnalytics[]> {
    try {
      const snapshot = await db()
        .collection('analytics')
        .doc('users')
        .collection(uid)
        .doc(period)
        .collection('data')
        .orderBy('date', 'desc')
        .limit(12)
        .get();
      
      return snapshot.docs.map(doc => ({ userId: uid, period, ...doc.data() } as UserAnalytics));
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return [];
    }
  }

  // Obtener estadísticas del sistema
  static async getSystemStats(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<SystemStats[]> {
    try {
      const snapshot = await db()
        .collection('analytics')
        .doc('system')
        .collection(period)
        .orderBy('date', 'desc')
        .limit(30)
        .get();
      
      return snapshot.docs.map(doc => ({ period, ...doc.data() } as SystemStats));
    } catch (error) {
      console.error('Error getting system stats:', error);
      return [];
    }
  }

  // Obtener resumen de usuario para admin
  static async getUserSummary(uid: string) {
    try {
      const [user, generations, purchases, analytics] = await Promise.all([
        this.getUserById(uid),
        this.getUserGenerations(uid, 10),
        this.getUserPurchases(uid, 10),
        this.getUserAnalytics(uid, 'monthly')
      ]);

      if (!user) return null;

      return {
        user,
        recentGenerations: generations,
        recentPurchases: purchases,
        analytics: analytics[0] || null,
        summary: {
          totalDocuments: user.stats.totalDocuments,
          totalSpent: user.stats.totalSpent,
          lastActivity: user.stats.lastGenerationAt || user.lastLoginAt,
          successRate: analytics[0]?.metrics.successRate || 0,
          averageProcessingTime: analytics[0]?.metrics.averageProcessingTime || 0
        }
      };
    } catch (error) {
      console.error('Error getting user summary:', error);
      return null;
    }
  }

  // Obtener estadísticas globales
  static async getGlobalStats() {
    try {
      const [users, systemStats] = await Promise.all([
        this.getAllUsers(),
        this.getSystemStats('monthly')
      ]);

      const activeUsers = users.filter(u => u.isActive);
      const totalRevenue = users.reduce((sum, u) => sum + (u.stats?.totalSpent || 0), 0);
      const totalDocuments = users.reduce((sum, u) => sum + (u.stats?.totalDocuments || 0), 0);

      return {
        users: {
          total: users.length,
          active: activeUsers.length,
          newThisMonth: users.filter(u => {
            const createdAt = new Date(u.createdAt);
            const now = new Date();
            return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
          }).length
        },
        documents: {
          total: totalDocuments,
          averagePerUser: users.length > 0 ? totalDocuments / users.length : 0
        },
        revenue: {
          total: totalRevenue,
          averagePerUser: users.length > 0 ? totalRevenue / users.length : 0
        },
        systemStats: systemStats[0] || null
      };
    } catch (error) {
      console.error('Error getting global stats:', error);
      return null;
    }
  }
}

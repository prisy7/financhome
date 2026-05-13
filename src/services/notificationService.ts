import { OrcamentoData } from '../types';
import { showToast } from '../utils';

const NOTIFIED_ITEMS_KEY = 'orcamento_notified_items';

/**
 * Service to handle browser notifications for upcoming financial items.
 */
export const notificationService = {
  /**
   * Requests permission to show notifications.
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações desktop');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  },

  /**
   * Checks for upcoming unpaid items and sends a notification if found.
   */
  async checkUpcomingBills(data: OrcamentoData, monthName: string, year: number): Promise<void> {
    if (Notification.permission !== 'granted') return;

    const today = new Date();
    const currentMonthIndex = today.getMonth();
    const currentYear = today.getFullYear();

    // Mapping month names to indices for comparison
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    const targetMonthIndex = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    
    // Only notify if we are looking at the current month and year (or near future)
    if (targetMonthIndex === -1) return;
    
    // Create a normalized Date object for the item's month
    const monthDate = new Date(year, targetMonthIndex, 1);
    
    const allItems = [
      ...data.fixas.map(i => ({ ...i, tipo: 'fixa' })),
      ...data.variaveis.map(i => ({ ...i, tipo: 'variável' })),
      ...(data.dividas || []).map(i => ({ ...i, tipo: 'dívida' })),
      ...(data.gastosMesHistorico || []).map(i => ({ ...i, tipo: 'gasto' }))
    ];

    const notifiedStr = localStorage.getItem(NOTIFIED_ITEMS_KEY) || '[]';
    const notifiedIds: string[] = JSON.parse(notifiedStr);
    const newNotifiedIds = [...notifiedIds];

    let notificationSent = false;

    for (const item of allItems) {
      if (item.paid || !item.vencimento) continue;
      
      const itemDate = new Date(year, targetMonthIndex, item.vencimento);
      const diffTime = itemDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Key to identify if we already notified this item today
      const notificationKey = `${monthName}-${year}-${item.tipo}-${item.id}-${today.toDateString()}`;

      if (diffDays >= 0 && diffDays <= 2 && !notifiedIds.includes(notificationKey)) {
        if (!notificationSent) {
          new Notification('💡 Vencimento Próximo', {
            body: `O item "${item.d}" vence em ${diffDays === 0 ? 'hoje' : diffDays + ' dias'}. R$ ${item.v.toFixed(2)}`,
            icon: '/favicon.ico' // Assuming favicon exists
          });
          notificationSent = true;
        }
        newNotifiedIds.push(notificationKey);
      }
    }

    // Keep only last 50 notifications in history to avoid bloat
    if (newNotifiedIds.length > 50) {
      newNotifiedIds.splice(0, newNotifiedIds.length - 50);
    }
    
    localStorage.setItem(NOTIFIED_ITEMS_KEY, JSON.stringify(newNotifiedIds));
  }
};

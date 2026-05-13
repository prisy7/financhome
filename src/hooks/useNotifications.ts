import { useEffect, useCallback } from 'react';
import { OrcamentoData, MonthInfo } from '../types';
import { notificationService } from '../services/notificationService';
import { showToast } from '../utils';

export function useNotifications(
  data: OrcamentoData | null, 
  availableMonths: MonthInfo[], 
  currentMonthId: string | null
) {
  const checkNotifications = useCallback(async () => {
    if (!data || !currentMonthId) return;

    const monthInfo = availableMonths.find(m => m.id === currentMonthId);
    if (!monthInfo) return;

    // Extract year from name (e.g., "Maio 2026")
    const parts = monthInfo.name.split(' ');
    const monthName = parts[0];
    const year = parseInt(parts[1]) || new Date().getFullYear();

    await notificationService.checkUpcomingBills(data, monthName, year);
  }, [data, availableMonths, currentMonthId]);

  // Initial check when app loads or month changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      checkNotifications();
    }, 3000); // Wait 3s after load to not overwhelm
    
    return () => clearTimeout(timeout);
  }, [checkNotifications]);

  const requestPermission = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      showToast('Notificações ativadas!', 'success');
      checkNotifications();
    } else {
      showToast('Notificações bloqueadas ou não suportadas.', 'error');
    }
    return granted;
  };

  return { requestPermission, checkNotifications };
}

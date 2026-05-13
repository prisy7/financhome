import React, { useState, useEffect, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, query, collection, setDoc, getDocFromServer, where, deleteField, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { MonthInfo, OrcamentoData } from '../types';
import { normalizeData } from '../dataMigration';
import { defaultData } from '../constants';
import { showToast } from '../utils';

import { calculateFirestoreUpdates, buildInitPayload } from '../firestoreDiff';

export function useFirebaseSync(
    currentMonthId: string, 
    setCurrentMonthId: React.Dispatch<React.SetStateAction<string>>,
    setAvailableMonths: React.Dispatch<React.SetStateAction<MonthInfo[]>>,
    setData: React.Dispatch<React.SetStateAction<OrcamentoData | null>>,
    loadLocalInitialData: () => void,
    hasPendingChangesRef?: React.MutableRefObject<boolean>
) {
    const [user, setUser] = useState<User | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [authResolved, setAuthResolved] = useState(false);
    const isSavingRef = useRef(false);
    const lastServerDataRef = useRef<OrcamentoData | null>(null);

    const [groupId, setGroupId] = useState<string | null>(null);
    const groupIdRef = useRef<string | null>(null);

    useEffect(() => {
        let unsubscribeMonths: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setSyncing(true);
                
                // Prioridade: Código de Família manual no localStorage -> Lista permitida -> UID pessoal
                const manualCode = localStorage.getItem('orcamento_household_code');
                let detectedGroupId = manualCode || currentUser.uid;
                
                // Failsafe to ensure the app doesn't stay stuck on loading if network hangs
                const failsafeTimeout = setTimeout(() => {
                    if (!authResolved) {
                        setAuthResolved(true);
                        setSyncing(false);
                    }
                }, 5000);

                if (!manualCode) {
                    try {
                        const { getDoc } = await import('firebase/firestore');
                        const allowedDoc = await getDoc(doc(db, 'config', 'allowed_users'));
                        if (allowedDoc.exists()) {
                            const data = allowedDoc.data();
                            const emails = data.emails || data.users || [];
                            if (currentUser.email && emails.includes(currentUser.email)) {
                                detectedGroupId = 'shared_household';
                            }
                        }
                    } catch (e) {
                        console.log("Using personal UID");
                    }
                }

                groupIdRef.current = detectedGroupId;
                setGroupId(detectedGroupId);

                // Sincronização de Meses
                const q = query(collection(db, 'months'), where('groupId', '==', detectedGroupId));
                
                let isFirstSnapshot = true;
                unsubscribeMonths = onSnapshot(q, (snapshot) => {
                    clearTimeout(failsafeTimeout);
                    const months: MonthInfo[] = [];
                    const firebaseIds = new Set<string>();
                    snapshot.forEach(docSnap => {
                        const d = docSnap.data();
                        firebaseIds.add(docSnap.id);
                        months.push({ id: docSnap.id, name: d.name, createdAt: d.createdAt || d.updatedAt || 0 });
                        if (d.data) {
                            localStorage.setItem('orcamento_data_' + docSnap.id, d.data);
                        }
                    });
                    
                    let hasPendingSyncs = false;
                    if (isFirstSnapshot) {
                        isFirstSnapshot = false;
                        const localMonthsStr = localStorage.getItem('orcamento_months_list');
                        if (localMonthsStr) {
                            try {
                                const localMonths = JSON.parse(localMonthsStr) as MonthInfo[];
                                const syncPromises = [];
                                
                                for (const lm of localMonths) {
                                    if (!firebaseIds.has(lm.id)) {
                                        const localDataStr = localStorage.getItem('orcamento_data_' + lm.id);
                                        if (localDataStr) {
                                            const docRef = doc(db, 'months', lm.id);
                                            try {
                                                const parsedData = JSON.parse(localDataStr);
                                                const initPayload = buildInitPayload(
                                                    parsedData,
                                                    detectedGroupId,
                                                    currentUser.uid,
                                                    lm.name,
                                                    Date.now(),
                                                    lm.createdAt || Date.now()
                                                );
                                                syncPromises.push(setDoc(docRef, initPayload));
                                            } catch (e) {
                                                console.error('Falha ao processar dados locais para sincronização:', lm.id, e);
                                            }
                                        }
                                    }
                                }
                                
                                if (syncPromises.length > 0) {
                                    hasPendingSyncs = true;
                                    setSyncing(true);
                                    Promise.all(syncPromises)
                                        .then(() => console.log('Sincronização local concluída'))
                                        .catch((err) => {
                                            console.error('Falha ao sincronizar meses locais:', err);
                                            showToast('Erro ao sincronizar dados locais. Verifique sua permissão para salvar.', 'error');
                                        })
                                        .finally(() => {
                                            setSyncing(false);
                                            setAuthResolved(true);
                                        });
                                }
                            } catch(e) { console.error(e); }
                        }
                    }

                    months.sort((a, b) => {
                        const timeA = a.createdAt || 0;
                        const timeB = b.createdAt || 0;
                        if (timeA !== timeB) return timeA - timeB;
                        return a.id.localeCompare(b.id);
                    });
                    setAvailableMonths(months);
                    localStorage.setItem('orcamento_months_list', JSON.stringify(months));
                    
                    if (!hasPendingSyncs) {
                        setSyncing(false);
                        setAuthResolved(true);
                    }

                    if (!currentMonthId && months.length > 0) {
                        const last = localStorage.getItem('orcamento_last_month_id') || months[months.length - 1].id;
                        const validLast = months.find(m => m.id === last) ? last : months[months.length - 1].id;
                        setCurrentMonthId(validLast);
                    }
                }, (err) => {
                    setSyncing(false);
                    setAuthResolved(true);
                    try {
                        handleFirestoreError(err, OperationType.LIST, 'months');
                    } catch (e) {
                        // ignore
                    }
                });
            } else {
                loadLocalInitialData();
                setAuthResolved(true);
            }
        });
        
        const testConnection = async () => {
            try {
                await getDocFromServer(doc(db, 'test', 'connection'));
            } catch (error) {
                if (error instanceof Error && error.message.includes('the client is offline')) {
                    console.error("Please check your Firebase configuration.");
                }
            }
        };
        testConnection();

        return () => {
            unsubscribeAuth();
            if (unsubscribeMonths) unsubscribeMonths();
        };
    }, []);

    useEffect(() => {
        isSavingRef.current = false;
        if (!user || !currentMonthId) return;

        setSyncing(true);
        const unsubscribeData = onSnapshot(doc(db, 'months', currentMonthId), (docSnap) => {
            if (docSnap.exists()) {
                if (docSnap.metadata.hasPendingWrites) {
                    return; // Ignora o snapshot de operações locais pendentes
                }

                if (isSavingRef.current) {
                    console.log('Confirmação do servidor recebida, liberando isSavingRef');
                    isSavingRef.current = false;
                    return;
                }

                if (hasPendingChangesRef && hasPendingChangesRef.current) {
                    console.log('Ignorando snapshot remoto porque há digitação local ativa');
                    return; 
                }

                const docData = docSnap.data();
                
                let parsed: OrcamentoData | null = null;
                
                if (docData?.data) {
                    try {
                        parsed = normalizeData(JSON.parse(docData.data));
                    } catch (e) {
                        console.error("Error parsing snapshot data string", e);
                    }
                } else if (docData) {
                    try {
                        const ARRAY_FIELDS = ['receitas', 'fixas', 'dividas', 'variaveis', 'gastosMes', 'gastosMesHistorico', 'cronograma'];
                        const mapped: any = { ...defaultData };
                        
                        for (const field of ARRAY_FIELDS) {
                            if (docData[`${field}_map`]) {
                                const mapObj = docData[`${field}_map`];
                                const order = docData[`${field}_order`] || [];
                                const arr = [];
                                
                                for (const id of order) {
                                    if (mapObj[id]) {
                                        arr.push(mapObj[id]);
                                        delete mapObj[id];
                                    }
                                }
                                for (const id of Object.keys(mapObj)) {
                                    arr.push(mapObj[id]);
                                }
                                mapped[field] = arr;
                            } else if (docData[field] && Array.isArray(docData[field])) {
                                 mapped[field] = docData[field]; // Fallback if arrays were saved directly
                            }
                        }

                        if (docData.aggregatedIds_map) {
                            mapped.aggregatedIds = Object.values(docData.aggregatedIds_map);
                        } else if (docData.aggregatedIds) {
                            mapped.aggregatedIds = docData.aggregatedIds;
                        }

                        if (docData.mercado) mapped.mercado = docData.mercado; // Fallback or if entire object was written
                        // Merge fields if they exist at root but shouldn't really be at root... wait, Firestore object updates write to the object.
                        // So `docData.mercado` will be the fully merged object automatically because Firestore handles dot notation by updating the nested object!
                        // That means `docData.mercado` is already the merged object.
                        
                        if (docData.provisoes) mapped.provisoes = docData.provisoes;
                        
                        if (docData.externalDebtUrl !== undefined) mapped.externalDebtUrl = docData.externalDebtUrl;
                        if (docData.schemaVersion !== undefined) mapped.schemaVersion = docData.schemaVersion;

                        parsed = normalizeData(mapped);
                    } catch (e) {
                         console.error("Error parsing mapped snapshot data", e);
                    }
                }

                if (parsed) {
                    lastServerDataRef.current = JSON.parse(JSON.stringify(parsed));
                    setData(prev => JSON.stringify(prev) === JSON.stringify(parsed) ? prev : parsed);
                    localStorage.setItem('orcamento_data_' + currentMonthId, JSON.stringify(parsed));
                }
            }
            setSyncing(false);
        }, (err) => {
            setSyncing(false);
            try {
                handleFirestoreError(err, OperationType.GET, `months/${currentMonthId}`);
            } catch (e) {
                // Ignore the thrown error to not crash the app, handleFirestoreError already logs it
            }
        });

        return () => unsubscribeData();
    }, [user, currentMonthId]);

    const saveMonthToFirestore = async (monthId: string, monthName: string, dataToSave: OrcamentoData, existingCreatedAt?: number) => {
        let activeGroupId = groupIdRef.current;
        if (!auth.currentUser) return;
        
        if (!activeGroupId) {
             const manualCode = localStorage.getItem('orcamento_household_code');
             activeGroupId = manualCode || auth.currentUser.uid;
        }

        isSavingRef.current = true;
        try {
            const docRef = doc(db, 'months', monthId);
            

            const local = dataToSave;
            const base = lastServerDataRef.current || ({} as any);
            
            const updates = calculateFirestoreUpdates(
                local, 
                base, 
                { uid: auth.currentUser.uid, groupId: activeGroupId }, 
                monthName, 
                existingCreatedAt
            );
            
            await updateDoc(docRef, updates).catch(async (err) => {
                 if (err.code === 'not-found') {
                     const initPayload = buildInitPayload(
                         local, 
                         activeGroupId, 
                         auth.currentUser!.uid, 
                         monthName, 
                         updates.updatedAt, 
                         existingCreatedAt
                     );
                     
                     await setDoc(docRef, initPayload);
                 } else {
                     throw err;
                 }
            });
            
            // To prevent echo diff loops immediately after we save and wait for snapshot
            lastServerDataRef.current = JSON.parse(JSON.stringify(local));

        } catch (err) {
            isSavingRef.current = false;
            handleFirestoreError(err, OperationType.WRITE, 'months');
        }
    };

    const deleteMonthFromFirestore = async (monthId: string) => {
        let activeGroupId = groupIdRef.current;
        if (!auth.currentUser) return;
        
        if (!activeGroupId) {
             const manualCode = localStorage.getItem('orcamento_household_code');
             activeGroupId = manualCode || auth.currentUser.uid;
        }
        try {
            const docRef = doc(db, 'months', monthId);
            // In a real scenario we'd call deleteDoc, but we need to ensure the user has permission
            // For now, we can just "mark" it or actually delete it if rules allow.
            // Since we use the same collection for data, we should ideally delete it.
            // Import deleteDoc from firebase/firestore
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(docRef);
        } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `months/${monthId}`);
        }
    };

    return { user, syncing, authResolved, saveMonthToFirestore, deleteMonthFromFirestore };
}

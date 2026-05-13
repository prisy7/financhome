import { deleteField } from 'firebase/firestore';

export function calculateFirestoreUpdates(local: any, base: any, authInfo: { uid: string, groupId: string }, monthName: string, existingCreatedAt?: number) {
    const updates: any = {};
    
    // Delete legacy fields if they exist
    updates.data = deleteField();
    updates.aggregatedIds = deleteField();
    updates.userId = authInfo.uid;
    updates.groupId = authInfo.groupId;
    updates.name = monthName;
    updates.updatedAt = Date.now();
    if (existingCreatedAt) updates.createdAt = existingCreatedAt;
    
    const ARRAY_FIELDS = ['receitas', 'fixas', 'dividas', 'variaveis', 'gastosMes', 'gastosMesHistorico', 'cronograma'];
    for (const field of ARRAY_FIELDS) {
        updates[field] = deleteField(); // migrate old root array if it exists
        
        const localArr = local[field] || [];
        const baseArr = base[field] || [];
        const localMap = Object.fromEntries(localArr.map((i: any) => [i.id, i]));
        const baseMap = Object.fromEntries(baseArr.map((i: any) => [i.id, i]));
        
        for (const [id, item] of Object.entries(localMap)) {
            if (JSON.stringify(item) !== JSON.stringify(baseMap[id])) {
                updates[`${field}_map.${id}`] = item;
            }
        }
        for (const id of Object.keys(baseMap)) {
            if (!localMap[id]) {
                updates[`${field}_map.${id}`] = deleteField();
            }
        }
        updates[`${field}_order`] = localArr.map((i: any) => i.id);
    }
    
    if (JSON.stringify(local.mercado) !== JSON.stringify(base.mercado)) {
        const mLocal = local.mercado || { metaSemanal: 0, gastosReais: [] };
        const mBase = base.mercado || { metaSemanal: 0, gastosReais: [] };
        if (mLocal.metaSemanal !== mBase.metaSemanal) updates['mercado.metaSemanal'] = mLocal.metaSemanal;
        if (JSON.stringify(mLocal.gastosReais) !== JSON.stringify(mBase.gastosReais)) updates['mercado.gastosReais'] = mLocal.gastosReais;
        if (mLocal.overflowAnterior !== mBase.overflowAnterior) updates['mercado.overflowAnterior'] = mLocal.overflowAnterior === undefined ? deleteField() : mLocal.overflowAnterior;
        if (mLocal.totalEstouradoMesAnterior !== mBase.totalEstouradoMesAnterior) updates['mercado.totalEstouradoMesAnterior'] = mLocal.totalEstouradoMesAnterior === undefined ? deleteField() : mLocal.totalEstouradoMesAnterior;
    }
    
    if (JSON.stringify(local.provisoes) !== JSON.stringify(base.provisoes)) {
        const pLocal = local.provisoes || {};
        const pBase = base.provisoes || {};
        for (const [key, prov] of Object.entries(pLocal)) {
            if (JSON.stringify(prov) !== JSON.stringify(pBase[key])) {
                updates[`provisoes.${key}`] = prov;
            }
        }
        for (const key of Object.keys(pBase)) {
            if (!pLocal[key]) {
                updates[`provisoes.${key}`] = deleteField();
            }
        }
    }

    if (JSON.stringify(local.aggregatedIds) !== JSON.stringify(base.aggregatedIds)) {
        const aggLocal = local.aggregatedIds || [];
        const aggBase = base.aggregatedIds || [];
        const localMap = Object.fromEntries(aggLocal.map((id: any) => [id, id]));
        const baseMap = Object.fromEntries(aggBase.map((id: any) => [id, id]));
        
        for (const id of Object.keys(localMap)) {
            if (!baseMap[id]) updates[`aggregatedIds_map.${id}`] = localMap[id];
        }
        for (const id of Object.keys(baseMap)) {
            if (!localMap[id]) updates[`aggregatedIds_map.${id}`] = deleteField();
        }
    }

    if (local.externalDebtUrl !== base.externalDebtUrl) updates.externalDebtUrl = local.externalDebtUrl || '';
    if (local.schemaVersion !== base.schemaVersion) updates.schemaVersion = local.schemaVersion || 0;
    
    return updates;
}

export function buildInitPayload(local: any, activeGroupId: string, uid: string, monthName: string, updatedAt: number, existingCreatedAt?: number) {
    const initPayload: any = {
        userId: uid,
        groupId: activeGroupId,
        name: monthName,
        updatedAt: updatedAt
    };
    if (existingCreatedAt) initPayload.createdAt = existingCreatedAt;
    
    const ARRAY_FIELDS = ['receitas', 'fixas', 'dividas', 'variaveis', 'gastosMes', 'gastosMesHistorico', 'cronograma'];
    for (const field of ARRAY_FIELDS) {
        const localArr = local[field] || [];
        initPayload[`${field}_map`] = Object.fromEntries(localArr.map((i: any) => [i.id, i]));
        initPayload[`${field}_order`] = localArr.map((i: any) => i.id);
    }
    initPayload.mercado = local.mercado || { metaSemanal: 0, gastosReais: [] };
    initPayload.provisoes = local.provisoes || {};
    initPayload.aggregatedIds_map = Object.fromEntries((local.aggregatedIds || []).map((id: any) => [id, id]));
    initPayload.externalDebtUrl = local.externalDebtUrl || '';
    initPayload.schemaVersion = local.schemaVersion || 0;

    return initPayload;
}

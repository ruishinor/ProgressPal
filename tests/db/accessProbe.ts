import Dexie from 'dexie';

import type { ProgressPalDatabase } from '@/lib/db/database';

export type DatabaseAccessOperation = {
  index: string | null;
  materializedRows: number;
  operation: 'count' | 'cursor' | 'get' | 'getMany' | 'mutate' | 'query';
  rowsReturned: number;
  rowsScanned: number;
  scope: string;
  store: string;
  transactionId: string;
  writes: number;
};

export type DatabaseAccessTransaction = {
  id: string;
  mode: 'readonly' | 'readwrite' | 'unknown';
  stores: string[];
};

export type DatabaseAccessSnapshot = {
  operations: DatabaseAccessOperation[];
  transactions: DatabaseAccessTransaction[];
  writesObserved: number;
};

export type DatabaseAccessCursorOperation = Pick<
  DatabaseAccessOperation,
  'operation' | 'store' | 'transactionId'
>;

export type DatabaseAccessProbeOptions = {
  beforeCursor?: (
    operation: DatabaseAccessCursorOperation,
  ) => Promise<void> | void;
};

function formatScope(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function installDatabaseAccessProbe(
  database: ProgressPalDatabase,
  options: DatabaseAccessProbeOptions = {},
) {
  const operations: DatabaseAccessOperation[] = [];
  const transactions: DatabaseAccessTransaction[] = [];
  const transactionIds = new WeakMap<object, string>();
  let transactionCounter = 0;
  let writesObserved = 0;

  function registerTransaction(
    transaction: object,
    stores: readonly string[],
    mode: DatabaseAccessTransaction['mode'],
  ) {
    const existingId = transactionIds.get(transaction);

    if (existingId !== undefined) {
      return existingId;
    }

    transactionCounter += 1;
    const id = `tx-${transactionCounter}`;

    transactionIds.set(transaction, id);
    transactions.push({ id, mode, stores: [...stores].sort() });

    return id;
  }

  function getTransactionId(transaction: object) {
    return (
      transactionIds.get(transaction) ??
      registerTransaction(transaction, ['<unknown>'], 'unknown')
    );
  }

  database.use({
    stack: 'dbcore',
    name: `progresspal-access-probe-${database.name}`,
    create(downlevelDatabase) {
      return {
        ...downlevelDatabase,
        transaction(stores, mode, options) {
          const transaction = downlevelDatabase.transaction(
            stores,
            mode,
            options,
          );

          registerTransaction(transaction, stores, mode);

          return transaction;
        },
        table(tableName) {
          const downlevelTable = downlevelDatabase.table(tableName);

          return {
            ...downlevelTable,
            async count(request) {
              const result = await downlevelTable.count(request);

              operations.push({
                index: request.query.index.name,
                materializedRows: 0,
                operation: 'count',
                rowsReturned: 0,
                rowsScanned: 0,
                scope: formatScope(request.query.range),
                store: tableName,
                transactionId: getTransactionId(request.trans),
                writes: 0,
              });

              return result;
            },
            async get(request) {
              const result = await downlevelTable.get(request);
              const rowsReturned = result === undefined ? 0 : 1;

              operations.push({
                index: null,
                materializedRows: rowsReturned,
                operation: 'get',
                rowsReturned,
                rowsScanned: rowsReturned,
                scope: formatScope(request.key),
                store: tableName,
                transactionId: getTransactionId(request.trans),
                writes: 0,
              });

              return result;
            },
            async getMany(request) {
              const result = await downlevelTable.getMany(request);
              const rowsReturned = result.filter(
                (value) => value !== undefined,
              ).length;

              operations.push({
                index: null,
                materializedRows: rowsReturned,
                operation: 'getMany',
                rowsReturned,
                rowsScanned: rowsReturned,
                scope: formatScope(request.keys),
                store: tableName,
                transactionId: getTransactionId(request.trans),
                writes: 0,
              });

              return result;
            },
            async mutate(request) {
              const result = await downlevelTable.mutate(request);
              const writes =
                request.type === 'deleteRange'
                  ? 1
                  : 'values' in request
                    ? request.values.length
                    : request.keys.length;

              writesObserved += writes;
              operations.push({
                index: null,
                materializedRows: 0,
                operation: 'mutate',
                rowsReturned: 0,
                rowsScanned: 0,
                scope: request.type,
                store: tableName,
                transactionId: getTransactionId(request.trans),
                writes,
              });

              return result;
            },
            async openCursor(request) {
              const transactionId = getTransactionId(request.trans);

              const beforeCursor = options.beforeCursor?.({
                operation: 'cursor',
                store: tableName,
                transactionId,
              });

              if (beforeCursor !== undefined) {
                await Dexie.waitFor(Promise.resolve(beforeCursor));
              }

              const cursor = await downlevelTable.openCursor(request);
              const operation: DatabaseAccessOperation = {
                index: request.query.index.name,
                materializedRows: 0,
                operation: 'cursor',
                rowsReturned: 0,
                rowsScanned: 0,
                scope: formatScope(request.query.range),
                store: tableName,
                transactionId,
                writes: 0,
              };

              operations.push(operation);

              if (cursor === null) {
                return null;
              }

              const start = cursor.start.bind(cursor);

              cursor.start = (onNext) =>
                start(() => {
                  operation.rowsReturned += 1;
                  operation.rowsScanned += 1;
                  return onNext();
                });

              return cursor;
            },
            async query(request) {
              const result = await downlevelTable.query(request);
              const rowsReturned = result.result.length;

              operations.push({
                index: request.query.index.name,
                materializedRows: rowsReturned,
                operation: 'query',
                rowsReturned,
                rowsScanned: rowsReturned,
                scope: formatScope(request.query.range),
                store: tableName,
                transactionId: getTransactionId(request.trans),
                writes: 0,
              });

              return result;
            },
          };
        },
      };
    },
  });

  return {
    reset() {
      operations.length = 0;
      transactions.length = 0;
      transactionCounter = 0;
      writesObserved = 0;
    },
    snapshot(): DatabaseAccessSnapshot {
      return {
        operations: operations.map((operation) => ({ ...operation })),
        transactions: transactions.map((transaction) => ({
          ...transaction,
          stores: [...transaction.stores],
        })),
        writesObserved,
      };
    },
  };
}

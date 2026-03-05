import { useEffect, useRef } from "react";

type DataTableOptions = {
  paging?: boolean;
  info?: boolean;
  searching?: boolean;
  ordering?: boolean;
  pageLength?: number;
  lengthChange?: boolean;
};

type UseDataTableArgs = {
  refreshKey?: string;
  rowCount?: number;
  pageLength?: number;
  options?: DataTableOptions;
};

export const useDataTable = (
  tableRef: React.RefObject<HTMLTableElement>,
  { refreshKey, rowCount, pageLength, options }: UseDataTableArgs
) => {
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      if (!tableRef.current) return;

      const module = await import("datatables.net-dt");
      await import("datatables.net-dt/css/dataTables.dataTables.css");

      if (!isMounted || !tableRef.current) return;

      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }

      const DataTable = module.default;
      instanceRef.current = new DataTable(tableRef.current, {
        paging: true,
        info: true,
        searching: false,
        ordering: false,
        pageLength: pageLength ?? rowCount ?? 10,
        lengthChange: false,
        ...options,
      });
    };

    setup();

    return () => {
      isMounted = false;
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, [tableRef, refreshKey, rowCount, pageLength, options]);
};

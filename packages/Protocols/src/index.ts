const registrations = new Map<string, any>();

export const getProtocols = async (specifier: string) => {
  const module = registrations.get(specifier);
  if (module !== undefined) {
    return module;
  } else {
    return await import(specifier);
  }
};

export const registerProtocols = (specifier: string, module: any) => {
    registrations.set(specifier, module);
};

export const getProtocolArray = async (runtime: any) => {
    const oldXDataSourceArray = await runtime.cacheManager.get(
        "XData_Collection"
    );
    console.log("protocol oldXData: ", oldXDataSourceArray);
    return oldXDataSourceArray ?? [];
};

export const updateProtocolArray = async (runtime: any, newXDataSourceArray) => {
    const oldXDataSourceArray = await runtime.cacheManager.get(
        "XData_Collection"
    );
    console.log("protocol oldXData: ", oldXDataSourceArray);

    if (newXDataSourceArray.length > 0) {
        await runtime.cacheManager.set("XData_Collection", newXDataSourceArray);
    }
};
const loadedModules = {};

export async function loadObjectData() {
    try {
        const response = await fetch('./save/example.json');
        if (!response.ok) throw new Error('Failed to load JSON files');
        return await response.json();
    } catch (error) {
        console.error('Error loading object data:', error);
        return {};
    }
}

export async function createObject(objName, objData) {
    if (!objData.modules || !Array.isArray(objData.modules)) {
        console.error(`Object ${objName} has no modules specified`);
        return null;
    }

    const resultInstance = {};
    const combinedParams = Object.assign({}, objData.params);

    for (const moduleName of objData.modules) {
        if (!loadedModules[moduleName]) {
            try {
                const module = await import(`./modul/${moduleName}.js`);
                loadedModules[moduleName] = module;
            } catch (error) {
                console.error(`Failed to load module ${moduleName}:`, error);
                continue;
            }
        }

        try {
            const module = loadedModules[moduleName];
            const instance = module.create(objData.params || {});
            
            Object.assign(resultInstance, instance);
            Object.assign(combinedParams, instance.params || {});
        } catch (error) {
            console.error(`Failed to create module ${moduleName} for object ${objName}:`, error);
        }
    }

    if (Object.keys(resultInstance).length === 0) {
        console.error(`No valid modules for object ${objName}`);
        return null;
    }

    return {
        instance: resultInstance,
        name: objName,
        params: combinedParams
    };
}
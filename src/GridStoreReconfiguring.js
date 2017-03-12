//https://github.com/slimjack/ExtJs-Utils

Ext.define('Ext.ux.plugin.GridStoreReconfiguring', {
    alias: 'plugin.gridstorereconfiguring',
    extend: 'Ext.AbstractPlugin',

    init: function (grid) {
        var me = this;
        if (!(grid instanceof Ext.grid.Panel)) {
            Ext.Error.raise('GridStoreReconfiguring plugin may be applied only to grid');
        }
        var bindableControls = new DynamicComponentQuery({
            view: grid,
            query: 'pagingtoolbar',//TODO: to be extended to select all bindable components (for now only pagintoolbars)
            methods: 'bindStore'
        });
        var currentStore = grid.store;
        bindableControls.bindStore(currentStore);
        bindableControls.on('componentsadd', function (addedComponents) {
            Ext.Array.each(addedComponents, function (component) {
                component.bindStore(currentStore);
            });
        });
        grid.on('reconfigure', function (sender, store, columns, oldStore) {
            if (store !== oldStore) {
                currentStore = store;
                bindableControls.bindStore(store);
            }
        });
    }
});
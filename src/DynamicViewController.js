//https://github.com/slimjack/ExtJs-Utils

Ext.define('Ext.ux.util.DynamicViewController', {
    extend: 'Deft.mvc.ViewController',

    dynamicControl: {
        allFields: {
            selector: '[isFormField]:not([excludeForm])',
            excludeQuery: '[isFormField] [isFormField]'
        }
    },

    isReadOnly: false,
    dynamicLayoutContainerSelector: '',

    init: function () {
        var me = this;
        var result = me.callParent();
        me.onBeforeViewInit();
        me.applyDynamicControl();
        return result;
    },

    afterRender: function () {
        var me = this;
        me.onViewInit();
        me.onViewInitAsync(function () {
            me.onAfterViewInitAsync();
        });
    },

    //region Protected
    onViewInit: function () {
        var me = this;
        me.onAfterViewInit();
    },

    onBeforeViewInit: Ext.emptyFn,

    onAfterViewInit: function () {
        var me = this;
        me.updateViewState();
    },

    onViewInitAsync: function (callback) {
        var me = this;
        callback();
    },

    onAfterViewInitAsync: Ext.emptyFn,

    applyLayout: function (layout) {
        var me = this;
        if (layout) {
            var mainView = me.getView();
            var dynamicLayoutContainer = me.dynamicLayoutContainerSelector ? mainView.query(me.dynamicLayoutContainerSelector)[0] : mainView;
            me.onBeforeApplyLayout();
            dynamicLayoutContainer.removeAll();
            dynamicLayoutContainer.add(layout);
            dynamicLayoutContainer.doLayout();
            me.onAfterApplyLayout();
        }
    },

    onBeforeApplyLayout: Ext.emptyFn,

    onAfterApplyLayout: function () {
        var me = this;
        me.updateViewState();
    },

    updateViewState: function () {
        var me = this;
        me.allFields.setReadOnly(me.isReadOnly);
    },

    finalizeEditing: function () {
        var me = this;
        me.getView().getEl().focus();
    },

    setReadOnly: function (isReadOnly) {
        var me = this;
        if (me.isReadOnly !== isReadOnly) {
            me.isReadOnly = isReadOnly;
            me.updateViewState();
        }
    },
    //endregion

    //region Private

    applyDynamicControl: function () {
        var me = this;
        Ext.Object.each(me.dynamicControl, function (configName, config) {
            if (!me[configName]) {
                var events = null;
                var listeners = Ext.clone(config.listeners);
                if (listeners) {
                    events = Ext.Object.getKeys(listeners);
                }
                me[configName] = new DynamicComponentQuery({
                    view: me.getView(),
                    query: config.selector || config.query,
                    excludeQuery: config.excludeQuery,
                    methods: config.methods,
                    events: events
                });
                if (listeners) {
                    listeners.scope = listeners.scope || me;
                    me[configName].on(listeners);
                }
            }
        });
    },
    //endregion

    statics: {
        initControlSection: function (data, cls, proto) {
            var control = {};
            if (proto.control) {
                var superControl = proto.control;
                delete proto.control;
                control = Ext.merge(control, superControl);
            }

            if (data.control) {
                var controlDefs = data.control;
                delete data.control;
                control = Ext.merge(control, controlDefs);
            }
            cls.control = proto.control = control;
        },

        initDynamicControlSection: function (data, cls, proto) {
            var dynamicControl = {};
            if (proto.dynamicControl) {
                var superDynamicControl = proto.dynamicControl;
                delete proto.dynamicControl;
                dynamicControl = Ext.merge(dynamicControl, superDynamicControl);
            }

            if (data.dynamicControl) {
                var dynamicControlDefs = data.dynamicControl;
                delete data.dynamicControl;
                dynamicControl = Ext.merge(dynamicControl, dynamicControlDefs);
            }
            cls.dynamicControl = proto.dynamicControl = dynamicControl;
        }
    }
},
function () {
    var Controller = this;

    Controller.onExtended(function (cls, data) {
        var proto = cls.prototype;

        Controller.initControlSection(data, cls, proto);
        Controller.initDynamicControlSection(data, cls, proto);
    });
});

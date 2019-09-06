import Phaser from "phaser";
import _ from "underscore";

const TYPE_IMAGE = "image";
const TYPE_COMPONENT = "component";
const TYPE_TEXT = "text";
const TYPE_TILE_SPRITE = "tileSprite";
const TYPE_POLYGON = "polygon";
const TYPE_ZONE = "zone";


/**
 * @typedef {Object} PhaserComps.ComponentClip.StateConfig
 * Component state config object, generated by jsfl exporter
 * @memberOf PhaserComps.ComponentClip
 * @property {number} [x=0] x coordinate of component
 * @property {number} [y=0] y coordinate of component
 * @property {number} [scaleX=1] x scale of component
 * @property {number} [scaleY=1] y scale of component
 * @property {number} [angle=0] angle of component
 * @property {Number} [alpha=1] Opacity of component (`0` to `1`).
 */

/**
 * @typedef {Object} PhaserComps.ComponentClip.ComponentConfig
 * @description
 * Component Config object, generated by jsfl exporter
 * @memberOf PhaserComps.ComponentClip
 * @property {String} type supported types are
 * `image`, `component`, `text`, `tileSprite`, `polygon`, `zone`
 * @property {Array<PhaserComps.ComponentClip.ComponentConfig>} [children] component children list
 * @property {String} [childId] unique component id, used by {@link StateManager}
 * @property {String} [key] key of component to find it with {@link UIComponentPrototype}.
 * Must be unique inside one state
 * @property {String} [image] Texture frame name. Only for component types `image` and `tileSprite`
 * @property {Phaser.GameObjects.TextStyle} [style] text style object, used only for `text` type
 * @property {Object<String, PhaserComps.ComponentClip.StateConfig>} [states] object keys are component ids to be enabled
 * at the specified state, and the StateConfig is position and scale params to setup for component
 * @property {Array<String>} masking List of component ids, that will be masked by this component.
 * Currently only polygon masks available.
 * @property {Number} [x=0] x coordinate of component
 * @property {Number} [y=0] y coordinate of component
 * @property {Number} [scaleX=1] x scale of component
 * @property {Number} [scaleY=1] y scale of component
 * @property {Number} [angle=0] angle of component in degrees
 * @property {Number} [alpha=1] Opacity of component (`0` to `1`).
 * @property {Number} [width] Component width.
 * only for `zone` type
 * @property {Number} [height] Component height.
 * only for `zone` type
 * @property {Array.<Number>} [vertices] Array of polygon vertices coords, `x` and `y` interleaving.
 * Only for `polygon` type
 * @property {int} [color] polygon color.
 * Only for `polygon` type
 */

/**
 * @class ComponentClip
 * @memberOf PhaserComps
 * @classdesc
 * @extends Phaser.GameObjects.Container
 * Component clip is Phaser Container instance.
 * Builds itself with provided jsfl-generated config object.
 *
 * Clip supports state switching. Best if controlled by
 * [UIComponentPrototype]{@link PhaserComps.UIComponents.UIComponentPrototype} instance
 *
 * @see PhaserComps.UIComponents.UIComponentPrototype
 *
 * @param {Phaser.Scene} scene Phaser scene to create component at
 * @param {ComponentConfig} config jsfl-generated config object
 * @param {Array<String>} textures Array of texture names, where component should find its texture frames
 */
export default class ComponentClip extends Phaser.GameObjects.Container {
	constructor(scene, config, textures) {
		super(scene, 0, 0);
		this.childComponentClips = [];

		/**
		 * component config object
		 * @type {Object}
		 * */
		this._config = config;

		/**
		 * component key
		 * @type {String}
		 */
		this._key = config.key;

		/**
		 * list of texture names to use in this component
		 * @type {Array<String>}
		 * */
		this._textures = textures;

		/**
		 * Texture frames to texture names map
		 * @type {Object<String>}
		 */
		this.imageFramesMap = {};

		/**
		 * Component's state manager instance. Helps to switch states and find active children by key
		 * @type {StateManager}
		 * */
		this._stateManager = new StateManager(this, config);

		this._childrenById = {};

		this._createImagesMap(textures);
		this._parseConfig();
	}

	/**
	 * @public
	 * @method PhaserComps.ComponentClip#getStateConfig
	 * @description
	 * Get raw state config object by state id, if exists
	 * @param {String} stateId state id
	 */
	getStateConfig(stateId) {
		return this._stateManager.getStateConfigById(stateId);
	}

	/**
	 * @public
	 * @method PhaserComps.ComponentClip#getStateIds
	 * @description
	 * Component state ids list.
	 * @returns {Array<String>}
	 */
	getStateIds() {
		return this._stateManager.stateIds;
	}
	/**
	 * @public
	 * @method PhaserComps.ComponentClip#setState
	 * @description
	 * Switch component view to specified stateId, if such stateId exists.
	 * Do not use it manually, if you are using UIComponentPrototype to control the view
	 *
	 * @param {String} stateId state id to switch to
	 * @param {Boolean} [force=false] if true, state will be setup again even if stateId was not changed
	 */
	setState(stateId, force) {
		this._stateManager.setState(stateId, force);
	}

	/**
	 * @public
	 * @method PhaserComps.ComponentClip#applyChildParams
	 * @description
	 * Apply child params
	 * @param {String} childId
	 * @param {StateConfig} params
	 */
	applyChildParams(childId, params) {
		if (!this._childrenById.hasOwnProperty(childId)) {
			return;
		}
		ComponentClip._setupCommonParams(this._childrenById[childId], params);
	}

	/**
	 * @public
	 * @method PhaserComps.ComponentClip#getChildClip
	 * @description returns current active component child view instance
	 * @param {String} key child key
	 * @returns {PhaserComps.ComponentClip|Phaser.GameObjects.GameObject}
	 */
	getChildClip(key) {
		return this._stateManager.getActiveComponentByKey(key);
	}

	/**
	 * @public
	 * @method PhaserComps.ComponentClip#getChildText
	 * @description returns current active component child text instance
	 * @param {String} key child text field key
	 * @returns {Phaser.GameObjects.Text}
	 */
	getChildText(key) {
		// TODO separate getter
		return this._stateManager.getActiveComponentByKey(key);
	}

	/**
	 * @public
	 * @method PhaserComps.ComponentClip#destroy
	 * @description destroy all child GameObjects and child clips recursively
	 * @param {Boolean} [fromScene=false]
	 */
	destroy(fromScene) {
		for (let child of this.childComponentClips) {
			child.destroy(fromScene);
		}
		super.destroy(fromScene)
	}

	/**
	 * @method PhaserComps.ComponentClip#_createImagesMap
	 * @description
	 * Fill the imageFramesMap object from provided textures.
	 * imageFramesMap used to
	 * @param {Array<String>} textures
	 * @private
	 * @ignore
	 */
	_createImagesMap(textures) {
		for (let textureName of textures) {
			const texture = this.scene.textures.get(textureName);
			if (!texture) {
				return;
			}
			const frames = texture.getFrameNames();
			for (let frameName of frames) {
				this.imageFramesMap[frameName] = textureName;
			}
		}
	}

	/**
	 * @method PhaserComps.ComponentClip#_parseConfig
	 * @description
	 * Builds component from config
	 * @private
	 * @ignore
	 */
	_parseConfig() {
		//ComponentView._setupCommonParams(this, this._config);
		if (this._config.hasOwnProperty("children")) {
			for (let childConfig of this._config.children) {
				this._createChildFromConfig(childConfig);
			}
		}
	}

	/**
	 * @method PhaserComps.ComponentClip#_createChildFromConfig
	 * @description creates child instance, depending on its type, add it to state manager
	 * @param {ComponentConfig} config child component config object
	 * @private
	 * @ignore
	 */
	_createChildFromConfig(config) {
		let child = null;
		let childId = config.childId;
		let childKey = config.key;
		let addAsChild = true;
		if (config.type === TYPE_IMAGE) {
			child = this._createImageFromConfig(config);
		} else if (config.type === TYPE_TEXT) {
			child = this._createTextFromConfig(config);
		} else if (config.type === TYPE_TILE_SPRITE) {
			child = this._createTileSpriteFromConfig(config);
		} else if (config.type === TYPE_COMPONENT) {
			child = new ComponentClip(this.scene, config, this._textures);
			ComponentClip._setupCommonParams(child, config);
		} else if (config.type === TYPE_ZONE) {
			child = this._createHitZoneFromConfig(config);
		} else if (config.type === TYPE_POLYGON) {
			child = this._createPolygonFromConfig(config);
			if (config.hasOwnProperty("masking")) {
				let mask = child.createGeometryMask();
				for (let maskedChildId of config.masking) {
					let maskedChild = this._childrenById[maskedChildId];
					maskedChild.setMask(mask);
				}
				addAsChild = false;
			}
		}
		if (child === null) {
			//console.warn("unknown component type", config.type, config);
			return;
		}
		//ComponentView._setupCommonParams(child, config);
		this._childrenById[childId] = child;
		this.childComponentClips.push(child);
		if (addAsChild) {
			this.add(child);
		}
		this._stateManager.addComponent(child, childId, childKey);
	}

	/**
	 * @description Create simple polygon with provided vertices from config
	 * @method PhaserComps.ComponentClip#_createPolygonFromConfig
	 * @param {PhaserComps.ComponentClip.ComponentConfig} config
	 * @returns {Phaser.GameObjects.Graphics}
	 * @private
	 * @ignore
	 */
	_createPolygonFromConfig(config) {
		const shape = this.scene.make.graphics();
		shape.fillStyle(config.color, config.hasOwnProperty("alpha") ? config.alpha : 1);
		shape.beginPath();
		let vertices = config.vertices;
		let verticesLength = vertices.length;
		for (let i = 0; i < verticesLength; i += 2) {
			shape.lineTo(vertices[i], vertices[i + 1]);
		}
		shape.closePath();
		shape.fillPath();
		ComponentClip._setupCommonParams(shape, config);
		if (!config.hasOwnProperty("masking")) {
			this.scene.add.existing(shape);
		}
		return shape;
	}

	/**
	 * @method PhaserComps.ComponentClip#_createTileSpriteFromConfig
	 * @description creates Phaser.GameObjects.TileSprite by jsfl-generated config and returns it
	 * @param {Object} config jsfl-generated TileSprite config object
	 * @returns {Phaser.GameObjects.TileSprite}
	 * @private
	 * @ignore
	 */
	_createTileSpriteFromConfig(config) {
		const sprite = this.scene.add.tileSprite(
			0, 0,
			config.width, config.height,
			this.imageFramesMap[config.image],
			config.image
		);
		sprite.setOrigin(0.5, 0.5); // Animate places shape coords to center
		ComponentClip._setupCommonParams(sprite, config);
		return sprite;
	}

	/**
	 * @method PhaserComps.ComponentClip#_createImageFromConfig
	 * @description creates Phaser.GameObjects.Image instance by jsfl-generated config and returns it
	 * @param {Object} config jsfl-generated Image config object
	 * @returns {Phaser.GameObjects.Image}
	 * @private
	 * @ignore
	 */
	_createImageFromConfig(config) {
		const image = this.scene.add.image(
			0, 0,
			this.imageFramesMap[config.image],
			config.image
		);
		image.setOrigin(0);
		ComponentClip._setupCommonParams(image, config);
		return image;
	}

	/**
	 * @method PhaserComps.ComponentClip#_createTextFromConfig
	 * @description creates Phaser.GameObjects.Text instance by jsfl-generated config and returns it
	 * @param {Object} config jsfl-generated Text config object
	 * @returns {Phaser.GameObjects.Text}
	 * @private
	 * @ignore
	 */
	_createTextFromConfig(config) {
		const text = this.scene.add.text(0, 0, config.text, config.textStyle);
		if (config.textStyle.align === "center") {
			text.setOrigin(0.5, 0);
		} else if (config.textStyle.align === "right") {
			text.setOrigin(1, 0);
		} else {
			text.setOrigin(0);
		}
		ComponentClip._setupCommonParams(text, config);
		return text;
	}

	/**
	 * @method PhaserComps.ComponentClip#_createHitZoneFromConfig
	 * @description creates Phaser.GameObjects.Zone instance by jsfl-generated config and returns it
	 * @param {Object} config jsfl-generated Zone config object
	 * @return {Phaser.GameObjects.Zone}
	 * @private
	 * @ignore
	 */
	_createHitZoneFromConfig(config) {
		return this.scene.add.zone(
			config.x || 0,
			config.y || 0,
			config.width,
			config.height
		).setOrigin(0);
	}

	/**
	 * @memberOf ComponentClip
	 * @description setup common game object params from jsfl-generated config
	 * @param {*} component
	 * @param {Object} config
	 * @ignore
	 */
	static _setupCommonParams(component, config) {
		let x = config.x || 0;
		let y = config.y || 0;
		let scaleX = config.scaleX || 1;
		let scaleY = config.scaleY || 1;
		let angle = config.angle || 0;
		let alpha = config.hasOwnProperty("alpha") ? config.alpha : 1;
		component.x = x;
		component.y = y;
		component.scaleX = scaleX;
		component.scaleY = scaleY;
		component.angle = angle;
		component.alpha = alpha;
	}
}

class State {
	/**
	 * @class State
	 * @classdesc State config decorator, for
	 * [StateManager]{@link PhaserComps.ComponentClip.StateManager} internal use only
	 * @param {PhaserComps.ComponentClip.StateConfig} config
	 * @memberOf PhaserComps.ComponentClip
	 */
	constructor(config) {
		/**
		 * State config object
		 * @type {PhaserComps.ComponentClip.StateConfig}
		 */
		this.config = config;
		/**
		 * Component ids, that are only active in this state
		 * @type {Array<String>}
		 */
		this.componentIds = [];
		this.componentIds = Object.keys(config);
		/*for (let componentId in config) {
			this.componentIds.push(componentId);
		}*/
	}
}

class StateManager {
	/**
	 * @class StateManager
	 * @memberOf PhaserComps.ComponentClip
	 * @classdesc
	 * For [ComponentClip]{@link PhaserComps.ComponentClip}
	 * internal use only
	 *
	 * Shows or hides component view instances depending on which state is active.
	 * Helps to get current active components by keys.
	 *
	 * @param {PhaserComps.ComponentClip} clip state manager creator clip instance
	 * @param {Object} config Main component states config object
	 *
	 */
	constructor(clip, config) {
		/**
		 *
		 * @type {PhaserComps.ComponentClip}
		 * @private
		 */
		this._clip = clip;

		/**
		 *
		 * @type {Array<String>}
		 * @private
		 */
		this._dynamicChildrenIds = [];

		/**
		 *
		 * @type {Object<State>}
		 * @private
		 */
		this._states = {};

		/**
		 * State ids array
		 * @type {Array<String>}
		 */
		this.stateIds = [];

		/**
		 *
		 * @type {Object}
		 * @private
		 */
		this._components = {};

		/**
		 *
		 * @type {State}
		 * @private
		 */
		this._currentState = null;

		/**
		 *
		 * @type {String}
		 * @private
		 */

		this._currentStateId = null;
		/**
		 *
		 * @type {Object<String>}
		 * @private
		 */
		this._componentKeys = {};

		this._residentComponentsByKey = {};
		let idsArrays = [];
		for (let stateId in config.states) {
			this.stateIds.push(stateId);
			let state = new State(config.states[stateId]);
			this._states[stateId] = state;
			idsArrays.push(state.componentIds);
		}
		this._dynamicChildrenIds = _.uniq(_.flatten(idsArrays));
	}

	/**
	 * @public
	 * @method PhaserComps.ComponentClip.StateManager#getStateConfigById
	 * @description
	 * Get raw state config object by state id
	 * @param {String} stateId state id
	 */
	getStateConfigById(stateId) {
		if (!this._states.hasOwnProperty(stateId)) {
			return null;
		}
		return this._states[stateId].config;
	}

	/**
	 * @method PhaserComps.ComponentClip.StateManager#addComponent
	 * @param {PhaserComps.ComponentClip|Phaser.GameObjects.GameObject} component
	 * component view instance, it may be text, image, sprite, or ComponentView instance
	 * @param {String} childId unique child id from component config
	 * @param {String} [childKey] child key from component config
	 */
	addComponent(component, childId, childKey) {
		if (_.indexOf(this._dynamicChildrenIds, childId) === -1) {
			if (typeof childKey !== "undefined") {
				this._residentComponentsByKey[childKey] = component;
			}
		} else {
			this._components[childId] = component;
			if (typeof childKey !== "undefined") {
				this._componentKeys[childId] = childKey;
			}
		}
	}

	/**
	 * Setup state with provided stateId, if exists
	 * @method PhaserComps.ComponentClip.StateManager#setState
	 * @param {String} stateId state id to setup
	 * @param {Boolean} force if true, update state even if stateId was not changed
	 */
	setState(stateId, force) {
		if (this._currentStateId === stateId && !force) {
			return;
		}
		if (!this._states.hasOwnProperty(stateId)) {
			return;
		}
		this._currentStateId = stateId;
		this._currentState = this._states[stateId];
		this.setupState();
	}

	/**
	 * Get component with provided key, if exists and is present in current state
	 * @method PhaserComps.ComponentClip.StateManager#getActiveComponentByKey
	 * @param {String} key Component key to get
	 * @returns {ComponentClip|Phaser.GameObjects.Image|Phaser.GameObjects.TileSprite|Phaser.GameObjects.Text|null}
	 */
	getActiveComponentByKey(key) {
		if (this._residentComponentsByKey.hasOwnProperty(key)) {
			return this._residentComponentsByKey[key];
		}
		if (this._currentState === null) {
			return null;
		}
		for (let i in this._currentState.componentIds) {
			let id = this._currentState.componentIds[i];
			if (this._componentKeys[id] === key) {
				return this._components[id];
			}
		}
		return null;
	}

	/**
	 * Show state components, apply its' state positions, and hide non-state components
	 * @method PhaserComps.ComponentClip.tateManager#setupState
	 * @protected
	 */
	setupState() {
		let idsToShow = this._currentState.componentIds;
		let idsToHide = _.difference(this._dynamicChildrenIds, idsToShow);
		let id;
		for (id of idsToHide) {
			this._components[id].visible = false;
		}
		for (id of idsToShow) {
			let component = this._components[id];
			component.visible = true;
			ComponentClip._setupCommonParams(component, this._currentState.config[id]);
		}
	}
}
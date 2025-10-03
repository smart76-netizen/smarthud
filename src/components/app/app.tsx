import {
	classNames,
	base64ToString,
	ePlayerSlotId,
	ePlayerDriverDataIndex,
	ePlayerIsFocus,
	eCurrentSlotId,
	getSlotIds,
	// fancyTimeFormatGap,
	prettyDebugInfo,
	currentFocusIsInput,
	getClassColor,
	getJason,
	// getInitials,
	hSLToRGB,
	rankData,
	showDebugMessage,
	showDebugMessageSmall,
	// IRatingData,
	INVALID
} from '../../lib/utils';
import { merge } from 'lodash-es';
import { observable, action } from 'mobx';
import { observer } from 'mobx-react';
import _, {
	dynamicTranslate as __,
	setLocale,
	Locales,
	getTranslations
} from './../../translate';
import Aids from '../aids/aids';
import Clock from '../clock/clock';
import CornerNames from '../cornerNames/cornerNames';
import CrewChief from '../crewChief/crewChief';
import Damage from '../damage/damage';
import Flags from '../flags/flags';
import Fuel from '../fuel/fuel';
import FuelDetail from '../fuelDetail/fuelDetail';
import getRecordedLapsData from './../../lib/trackData';
import Gforce from '../gforce/gforce';
import Graphs from '../graphs/graphs';
import Info from '../info/info';
import Inputs from '../inputs/inputs';
import IShared, {
	ESession,
	EControl,
	IDriverData
} from './../../types/r3eTypes';
import Motec from '../motec/motec';
import OvertakingAids from '../overtakingAids/overtakingAids';
// import PerformanceInfo from '../performanceInfo/performanceInfo';
import PitLimiter from '../pitLimiter/pitLimiter';
import Pitstop from '../pitstop/pitstop';
import PositionBar from '../positionBar/positionBar';
import Progress from '../progress/progress';
import r3e, {
	registerUpdate,
	unregisterUpdate,
	nowCheck,
	noData
} from './../../lib/r3e';
import React, { ChangeEvent } from 'react';
import Spotting from '../spotting/spotting';
import StartingLights from '../startingLights/startingLights';
import style from './app.scss';
import SvgIcon from '../svgIcon/svgIcon';
import Tires from '../tires/tires';
import TvTower from '../tvTower/tvTower';

interface IProps {}

interface ISubSettings {
	[key: string]: {
		enabled: boolean;
		text(): string;
	};
}

interface IDriverInfo {
	isUser: boolean;
	id: number;
	userId: number;
	engineState: number;
	name: string;
	modelId: number;
	currentTime: number;
	validLap: number;
	performanceIndex: number;
	bestLapTime: number;
	bestLapTimeLeader: number;
	bestLapTimeClass: number;
	pitting: number;
	classId: number;
	classColor: string;
	lapDistance: number;
	finishStatus: number;
	speed: number;
	lapPrevious: number;
	distDiff: number;
	timeDiff: number;
	dPos: {
		X: number;
		Y: number;
		Z: number;
	};
}

interface ILastPosVector {
	[index: string]: {
		X: number;
		Y: number;
		Z: number;
	};
}

interface IPitBoxDistances {
	// Index TrackLayoutId
	[index: string]: {
		[index: string]: {
			X: number;
			Y: number;
			Z: number;
		};
	};
}

interface IPitBoxEntrances {
	[index: string]: number;
}

interface ILapData {
	[index: string]: number[][];
}

interface ILapRecords {
	// Index = SlotId
	[index: number]: number[][];
	// 0 - dist array
	// 1 - time array
}

interface IClassLaps {
	// Index = ClassPerformanceIndex
	[index: number]: number;
	// lapTime
}

export interface IDriverDiffs {
	// Index = SlotId
	[index: number]: number[][];
	// 0 - lapTime
	// 1 - diff to watched Car
}

export interface IDriverPitInfo {
	// Index = SlotId
	[index: number]: number[];
	// 0 - Is In Pit
	// 1 - Is In Pit Start
	// 2 - Pit Enter Time
	// 3 - Pit Stand Time
	// 4 - Pit Start Time
	// 5 - Pit Exit Time
}

export interface IDriverLapInfo {
	// Index = SlotId
	[index: number]: number[];
	// Previous Lap
	// Lap Time To Show
	// Show Until
	// color - r
	// color - g
	// color - b
	// color - a
}

export interface IWidgetSetting {
	id: string;
	enabled: boolean;
	volume: number;
	resetIt: boolean;
	zoom: number;
	position: {
		x: number;
		y: number;
	};
	subSettings: ISubSettings;
	name(): string;
}

let lowPerformanceMode = false;
let highPerformanceMode = false;
let supremePerformance = false;
let showAllMode = false;
let hideWidgets = false;
let blockFuelCalc = false;
let speedInMPH = false;
let eDriverNum = 3;
let eRankInvert = false;
let eRankInvertRelative = false;
let eLogoUrl = './../../img/logo.png';
let eDriverPitInfo: IDriverPitInfo = {};
let eDriverLapInfo: IDriverLapInfo = {};
let eDriverDiffs: IDriverDiffs = {};
let eResetId = '';
let eIsLeaderboard = false;
let eIsHillClimb = false;
let isMenu = false;
const eIsIngameBrowser = window.clientInformation.appVersion.toString().match(/64.0/);

export {
	lowPerformanceMode,
	highPerformanceMode,
	supremePerformance,
	showAllMode,
	hideWidgets,
	blockFuelCalc,
	speedInMPH,
	eDriverNum,
	eRankInvert,
	eRankInvertRelative,
	eLogoUrl,
	eDriverPitInfo,
	eDriverLapInfo,
	eDriverDiffs,
	eIsIngameBrowser,
	eIsLeaderboard,
	eIsHillClimb
};

const currentVersion = 1.25;

@observer
export default class App extends React.Component<IProps> {
	appRef = React.createRef<HTMLDivElement>();

	@observable
	playerSlotId = -1;

	@observable
	playerDriverDataIndex = -1;

	@observable
	playerIsFocus = false;

	@observable
	currentSlotId = -1;

	@observable
	storedVersion = -1;

	@observable
	replayCheck = true;

	@observable
	replayReloadDone = false;

	@observable
	badReplay = false;

	@observable
	changeLogRead = true;

	@observable
	changeLogToggled = false;

	@observable
	trackingString = '';

	@observable
	tempTrackingString = '';

	@observable
	driverPitInfo: IDriverPitInfo = {};

	@observable
	pitBoxDistances: IPitBoxDistances = {};

	@observable
	pitBoxEntrances: IPitBoxEntrances = {};

	@observable
	lastPosition: ILastPosVector = {};

	@observable
	driverLapInfo: IDriverLapInfo = {};

	@observable
	driverLapRecord: ILapRecords = {};

	@observable
	driverRecordedLaps = [[-1], [0], [0], [0]];

	@observable
	storedRecordedLaps: ILapData = {};

	@observable
	classBestLap: IClassLaps = {};

	@observable
	currentClassLapData = [[-1], [0], [0], [0]];

	@observable
	tempClassLapData = [[-1], [0], [0], [0]];

	@observable
	drivers: IDriverInfo[] = [];

	// loadTime = Date.now();
	@observable
	loadTime = Date.now();

	// Deal with centering the main ui so it is always stays 16:9
	@observable
	aspectHeight: number | null = null;

	@observable
	hide = localStorage.hideWidgets
		?	localStorage.hideWidgets === '1'
			?	true
			:	false
		:	false || false;

	@observable
	resetInterval = INVALID;

	@observable
	showEditGrid = false;

	@observable
	enterPressed = false;

	@observable
	somethingResetted = false;

	@observable
	language = localStorage.language || 'en';

	@observable
	lowPerfo = localStorage.lowPerformanceMode
		?	localStorage.lowPerformanceMode === '1'
			?	true
			:	false
		:	false || false;

	@observable
	highPerfo = localStorage.highPerformanceMode
		?	localStorage.highPerformanceMode === '1'
			?	true
			:	false
		:	false || false;

	@observable
	snapOn = localStorage.snapOn
		?	localStorage.snapOn === '1'
			?	true
			:	false
		:	false || false;

	@observable
	elBlocko = blockFuelCalc || false;

	@observable
	mphSpeed = speedInMPH || false;

	@observable
	showAll = localStorage.showAllMode
		?	localStorage.showAllMode === '1'
			?	true
			:	false
		:	false || false;

	@observable
	mouseTimeout = INVALID;

	@observable
	clearDataTimer = INVALID;

	@observable
	hideMouse = false;
	mouseOnTheMove = false;

	@observable
	lastMousemovement = 0;

	@observable
	nowMousemovement = 0;

	@observable
	shiftModifier = false;

	@observable
	driverNum = localStorage.driverNum
		?	localStorage.driverNum === '1'
			?	1
			:	localStorage.driverNum === '2'
				?	2
				:	localStorage.driverNum === '3'
					?	3
					:	3
		:	3 || 3;

	@observable
	rankInvert = localStorage.rankInvert
		?	localStorage.rankInvert === '1'
			?	true
			:	false
		:	false || false;

	@observable
	rankInvertRelative = localStorage.rankInvertRelative
		?	localStorage.rankInvertRelative === '1'
			?	true
			:	false
		:	false || false;

	@observable
	currentLayout = localStorage.currentLayout
		?	localStorage.currentLayout === '1'
			?	1
			:	localStorage.currentLayout === '2'
				?	2
				:	localStorage.currentLayout === '3'
					?	3
					:	1
		:	1 || 1;

	@observable
	lockHud = localStorage.lockHudStatus
		?	localStorage.lockHudStatus === '1'
			?	true
			:	false
		:	false;

	@observable
	hLogoUrl = this.currentLayout === 1
		?	localStorage.currentLogo || './../../img/logo.png'
		:	this.currentLayout === 2
			?	localStorage.currentLogo2 || './../../img/logo.png'
			:	this.currentLayout === 3
				?	localStorage.currentLogo3 || './../../img/logo.png'
				:	'./../../img/logo.png' || './../../img/logo.png';

	@observable
	currentNumDrivers = 0;

	@observable
	lastNumDrivers = 0;

	@observable
	throttlePedal = 0;

	@observable
	brakePedal = 0;

	@observable
	clutchPedal = 0;

	@observable
	gameInMenus = false;

	@observable
	gameInReplay = false;

	// @observable
	// theError = '';

	@observable
	defaultsettings: { [key: string]: IWidgetSetting } = {
		positionBar: {
			id: 'positionBar',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1,
			name: __('Position bar'),
			subSettings: {
				showStandings: {
					text: __('Show Standings'),
					enabled: true
				},
				showPitTime: {
					text: __('Show Pit-Times'),
					enabled: true
				},
				autoHidePitTime: {
					text: __('Auto-Hide Pit-Times'),
					enabled: true
				},
				showLastLaps: {
					text: __('Show Last-Lap-Times'),
					enabled: true
				},
				lapTime: {
					text: __('Show Lap-Time'),
					enabled: true
				},
				currentPosition: {
					text: __('Show Current Position'),
					enabled: true
				},
				sessionLaps: {
					text: __('Show Completed Laps'),
					enabled: true
				},
				sessionLapsRemain: {
					text: __('Show Estimated Laps left'),
					enabled: true
				},
				sessionLapsTotal: {
					text: __('Show Estimated Laps'),
					enabled: true
				},
				showSOF: {
					text: __('Show Strength of Field'),
					enabled: true
				},
				showLastLap: {
					text: __('Show Last-Lap'),
					enabled: true
				},
				showBestLap: {
					text: __('Show Best-Lap'),
					enabled: true
				},
				showIncidentPoints: {
					text: __('Show Incident Points'),
					enabled: true
				},
				sessionTime: {
					text: __('Show Session-Time'),
					enabled: true
				},
				shortBar: {
					text: __('Only show 5 Ahead/Behind'),
					enabled: false
				}
			},
			position: {
				x: INVALID,
				y: INVALID
			}
		},
		positionBarRelative: {
			id: 'positionBarRelative',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 0.97,
			name: __('Relative'),
			subSettings: {
				showAllSessions: {
					text: __('Show in all Sessions'),
					enabled: true
				},
				showGapsInSeconds: {
					text: __('Show Gaps in Seconds'),
					enabled: true
				},
				showCarNames: {
					text: __('Show Car Names'),
					enabled: true
				},
				showCarLogos: {
					text: __('Show Manufacturer Logos'),
					enabled: false
				},
				showClassLogos: {
					text: __('Show Class Logos'),
					enabled: true
				},
				showPitStops: {
					text: __('Show Pit-Status'),
					enabled: true
				},
				showRanking: {
					text: __('Show Ranking Data'),
					enabled: true
				},
				showUserId: {
					text: __('Show Drivers UserId'),
					enabled: false
				},
				numberDrivers: {
					text: __('Drivers Ahead/Behind'),
					enabled: true
				}
			},
			position: {
				x: 1324,
				y: 917
			}
		},
		tvTower: {
			id: 'tvTower',
			enabled: false,
			resetIt: false,
			volume: 0,
			zoom: 0.6999999999999997,
			name: __('TV Tower'),
			subSettings: {
				showLogo: {
					text: __('Show Logo'),
					enabled: true
				},
				showSessionInfo: {
					text: __('Show Session Info'),
					enabled: true
				},
				showLongNames: {
					text: __('Show full Lastname'),
					enabled: true
				},
				showCarLogos: {
					text: __('Show Manufacturer Logos'),
					enabled: true
				},
				showTireInfo: {
					text: __('Show Tire Infos'),
					enabled: true
				},
				showPitWindow: {
					text: __('Show Pit-Window Info'),
					enabled: true
				},
				showPitStatus: {
					text: __('Show Pit-Status'),
					enabled: true
				},
				showPitTime: {
					text: __('Show Pit-Times'),
					enabled: true
				},
				autoHidePitTime: {
					text: __('Auto-Hide Pit-Times'),
					enabled: true
				},
				showLastLaps: {
					text: __('Show Last-Lap-Times'),
					enabled: true
				},
				showRanking: {
					text: __('Show Ranking Data'),
					enabled: true
				},
				showIncidentPoints: {
					text: __('Show Incident Points'),
					enabled: true
				},
				showOwnClassOnly: {
					text: __('Show only Own Class'),
					enabled: false
				},
				showFullGrid: {
					text: __('Show full Driver Grid'),
					enabled: true
				},
				showStoppedCars: {
					text: __('Show Stopped Drivers'),
					enabled: true
				},
				hLogoUrl: {
					text: __('Change Logo URL'),
					enabled: false
				}
			},
			position: {
				x: 1,
				y: 1
			}
		},
		progress: {
			id: 'progress',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 0.9099999999999999,
			name: __('Delta'),
			subSettings: {
				deltaText: {
					text: __('Delta text'),
					enabled: true
				},
				deltaBars: {
					text: __('Delta bars'),
					enabled: true
				},
				deltaNextPosition: {
					text: __('Next position'),
					enabled: true
				},
				estimatedLapTime: {
					text: __('Estimated lap time'),
					enabled: true
				},
				estimatedPosition: {
					text: __('Estimated position'),
					enabled: true
				},
				lastLap: {
					text: __('Last Lap'),
					enabled: true
				},
				sectorsAsTime: {
					text: __('Show Sectors as time'),
					enabled: true
				},
				deltaInRace: {
					text: __('Delta to Best-Lap in Race'),
					enabled: true
				},
				hideInRace: {
					text: __('Hide in race'),
					enabled: false
				}
			},
			position: {
				x: 87,
				y: -246
			}
		},
		tires: {
			id: 'tires',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.06,
			name: __('Tires'),
			subSettings: {
				showDetails: {
					text: __('Show Inner & Outer'),
					enabled: true
				},
				showTempNumbers: {
					text: __('Show Tire-Temp numbers'),
					enabled: true
				},
				showCelsius: {
					text: __('Tire-Temp in Celsius'),
					enabled: true
				},
				showWearNumbers: {
					text: __('Show Tire-Wear numbers'),
					enabled: true
				},
				showWearPerLap: {
					text: __('Show Tire-Wear per Lap'),
					enabled: true
				},
				showWearLaps: {
					text: __('Show Tire Est. Laps-Left'),
					enabled: true
				},
				showPressureNumbers: {
					text: __('Show Tire-Pressure numbers'),
					enabled: true
				},
				showPsi: {
					text: __('Tire-Pressure in PSI'),
					enabled: false
				}
			},
			position: {
				x: 5,
				y: 960
			}
		},
		fuelDetail: {
			id: 'fuelDetail',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 0.5999999999999996,
			name: __('Fuel & Lap Details'),
			subSettings: {
				showStoredInfo: {
					text: __('Show Lap Details'),
					enabled: true
				},
				showFuelTime: {
					text: __('Show Estimate Time'),
					enabled: true
				},
				clearAnySession: {
					text: __('Auto-Clear Data on Session-Change'),
					enabled: false
				},
				clearRaceSession: {
					text: __('Auto-Clear Data for Race-Session'),
					enabled: false
				},
				clearComboData: {
					text: __('Clear this Combo Stored Data'),
					enabled: false
				},
				clearAllData: {
					text: __('Clear all Stored Data'),
					enabled: false
				}
			},
			position: {
				x: 376,
				y: 962
			}
		},
		pitstop: {
			id: 'pitstop',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 0.6899999999999997,
			name: __('Pitstop'),
			subSettings: {
				pitWindow: {
					text: __('Show Pit-Window'),
					enabled: true
				},
				pitTimeOnly: {
					text: __('Show Pit-Time only'),
					enabled: false
				}
			},
			position: {
				x: 1412,
				y: 676
			}
		},
		spotting: {
			id: 'spotting',
			enabled: true,
			resetIt: false,
			volume: 0.5,
			zoom: 1.9400000000000008,
			name: __('Spotting / Radar'),
			subSettings: {
				shouldBeep: {
					text: __('Should beep'),
					enabled: true
				},
				beepVolume: {
					text: __('VOL:'),
					enabled: true
				},
				shouldOnlyBeep: {
					text: __('No Radar - Beep only'),
					enabled: false
				},
				warnFront: {
					text: __('Warn Front'),
					enabled: false
				},
				autoHide: {
					text: __('Auto Hide'),
					enabled: true
				}
			},
			position: {
				x: 825,
				y: 803
			}
		},
		motec: {
			id: 'motec',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.6300000000000006,
			name: __('Motec'),
			subSettings: {
				plBlink: {
					text: __('PitLimiter Blink'),
					enabled: true
				},
				plBBlink: {
					text: __('Background Blinking'),
					enabled: true
				},
				showECU: {
					text: __('Show Electronics'),
					enabled: true
				},
				showTCPercent: {
					text: __('Show TC in percent if available'),
					enabled: true
				},
				showMPH: {
					text: __('Speed in MPH'),
					enabled: false
				}
			},
			position: {
				x: 1745,
				y: 917
			}
		},
		/*performanceInfo: {
			id: 'performanceInfo',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1,
			name: __('Performance Info'),
			subSettings: {
				showAllTimeBest: {
					text: __('Show Alltime Best-Lap'),
					enabled: true
				},
				showSessionBest: {
					text: __('Show Session Best-Lap'),
					enabled: true
				},
				showSessionAverage: {
					text: __('Show Session Average-Lap'),
					enabled: true
				},
				showAvgSpeed: {
					text: __('Show Average Speed'),
					enabled: true
				},
				showPosGain: {
					text: __('Show Position Gain/Loss'),
					enabled: true
				}
			},
			position: {
				x: 960,
				y: 540
			}
		},*/
		cornerNames: {
			id: 'cornerNames',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 0.5299999999999998,
			name: __('Track Info'),
			subSettings: {
				trackDetails: {
					text: __('Track Name & Details'),
					enabled: true
				},
				corners: {
					text: __('Show Corner Names'),
					enabled: true
				},
				noColors: {
					text: __('Just-White'),
					enabled: true
				}
			},
			position: {
				x: 2,
				y: 892
			}
		},
		inputs: {
			id: 'inputs',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.6300000000000006,
			name: __('Inputs'),
			subSettings: {
				showInputNumbers: {
					text: __('Show Numbers'),
					enabled: true
				},
				steeringInput: {
					text: __('Steering wheel'),
					enabled: true
				}
			},
			position: {
				x: 1670,
				y: 917
			}
		},
		fuel: {
			id: 'fuel',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.6300000000000006,
			name: __('Fuel'),
			subSettings: {},
			position: {
				x: 1883,
				y: 917
			}
		},
		gforce: {
			id: 'gforce',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.1800000000000002,
			name: __('G-Force'),
			subSettings: {},
			position: {
				x: 1157,
				y: 962
			}
		},
		aids: {
			id: 'aids',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 0.95,
			name: __('Car assists'),
			subSettings: {},
			position: {
				x: 150,
				y: 962
			}
		},
		overtakingAids: {
			id: 'overtakingAids',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1,
			name: __('P2P/DRS'),
			subSettings: {},
			position: {
				x: 1669,
				y: 837
			}
		},
		startingLights: {
			id: 'startingLights',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 0.95,
			name: __('Race start lights'),
			subSettings: {},
			position: {
				x: 702,
				y: 227
			}
		},
		info: {
			id: 'info',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.3600000000000003,
			name: __('Race info'),
			subSettings: {},
			position: {
				x: 17,
				y: 408
			}
		},
		pitLimiter: {
			id: 'pitLimiter',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.6800000000000006,
			name: __('Pit limiter'),
			subSettings: {},
			position: {
				x: 820,
				y: 227
			}
		},
		damage: {
			id: 'damage',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.1500000000000001,
			name: __('Damage'),
			subSettings: {},
			position: {
				x: 367,
				y: 1098
			}
		},
		flags: {
			id: 'flags',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.4400000000000004,
			name: __('Flags'),
			subSettings: {},
			position: {
				x: 1218,
				y: 121
			}
		},
		crewChief: {
			id: 'crewChief',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.03,
			name: __('Crew Chief'),
			subSettings: {},
			position: {
				x: 1719,
				y: 273
			}
		},
		graphs: {
			id: 'graphs',
			enabled: false,
			resetIt: false,
			volume: 0,
			zoom: 1,
			name: __('Telemetry'),
			subSettings: {},
			position: {
				x: INVALID,
				y: INVALID
			}
		},
		clock: {
			id: 'clock',
			enabled: false,
			resetIt: false,
			volume: 0,
			zoom: 1.5000000000000004,
			name: __('Clock'),
			subSettings: {},
			position: {
				x: 1755,
				y: 140
			}
		}
	};

	@observable
	settings: { [key: string]: IWidgetSetting } = {
		positionBar: {
			id: 'positionBar',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1,
			name: __('Position bar'),
			subSettings: {
				showStandings: {
					text: __('Show Standings'),
					enabled: true
				},
				showPitTime: {
					text: __('Show Pit-Times'),
					enabled: true
				},
				autoHidePitTime: {
					text: __('Auto-Hide Pit-Times'),
					enabled: true
				},
				showLastLaps: {
					text: __('Show Last-Lap-Times'),
					enabled: true
				},
				lapTime: {
					text: __('Show Lap-Time'),
					enabled: true
				},
				currentPosition: {
					text: __('Show Current Position'),
					enabled: true
				},
				sessionLaps: {
					text: __('Show Completed Laps'),
					enabled: true
				},
				sessionLapsRemain: {
					text: __('Show Estimated Laps left'),
					enabled: true
				},
				sessionLapsTotal: {
					text: __('Show Estimated Laps'),
					enabled: true
				},
				showSOF: {
					text: __('Show Strength of Field'),
					enabled: true
				},
				showLastLap: {
					text: __('Show Last-Lap'),
					enabled: true
				},
				showBestLap: {
					text: __('Show Best-Lap'),
					enabled: true
				},
				showIncidentPoints: {
					text: __('Show Incident Points'),
					enabled: true
				},
				sessionTime: {
					text: __('Show Session-Time'),
					enabled: true
				},
				shortBar: {
					text: __('Only show 5 Ahead/Behind'),
					enabled: false
				}
			},
			position: {
				x: INVALID,
				y: INVALID
			}
		},
		positionBarRelative: {
			id: 'positionBarRelative',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 0.97,
			name: __('Relative'),
			subSettings: {
				showAllSessions: {
					text: __('Show in all Sessions'),
					enabled: true
				},
				showGapsInSeconds: {
					text: __('Show Gaps in Seconds'),
					enabled: true
				},
				showCarNames: {
					text: __('Show Car Names'),
					enabled: true
				},
				showCarLogos: {
					text: __('Show Manufacturer Logos'),
					enabled: false
				},
				showClassLogos: {
					text: __('Show Class Logos'),
					enabled: true
				},
				showPitStops: {
					text: __('Show Pit-Status'),
					enabled: true
				},
				showRanking: {
					text: __('Show Ranking Data'),
					enabled: true
				},
				showUserId: {
					text: __('Show Drivers UserId'),
					enabled: false
				},
				numberDrivers: {
					text: __('Drivers Ahead/Behind'),
					enabled: true
				}
			},
			position: {
				x: 1324,
				y: 917
			}
		},
		tvTower: {
			id: 'tvTower',
			enabled: false,
			resetIt: false,
			volume: 0,
			zoom: 0.6999999999999997,
			name: __('TV Tower'),
			subSettings: {
				showLogo: {
					text: __('Show Logo'),
					enabled: true
				},
				showSessionInfo: {
					text: __('Show Session Info'),
					enabled: true
				},
				showLongNames: {
					text: __('Show full Lastname'),
					enabled: true
				},
				showCarLogos: {
					text: __('Show Manufacturer Logos'),
					enabled: true
				},
				showTireInfo: {
					text: __('Show Tire Infos'),
					enabled: true
				},
				showPitWindow: {
					text: __('Show Pit-Window Info'),
					enabled: true
				},
				showPitStatus: {
					text: __('Show Pit-Status'),
					enabled: true
				},
				showPitTime: {
					text: __('Show Pit-Times'),
					enabled: true
				},
				autoHidePitTime: {
					text: __('Auto-Hide Pit-Times'),
					enabled: true
				},
				showLastLaps: {
					text: __('Show Last-Lap-Times'),
					enabled: true
				},
				showRanking: {
					text: __('Show Ranking Data'),
					enabled: true
				},
				showIncidentPoints: {
					text: __('Show Incident Points'),
					enabled: true
				},
				showOwnClassOnly: {
					text: __('Show only Own Class'),
					enabled: false
				},
				showFullGrid: {
					text: __('Show full Driver Grid'),
					enabled: true
				},
				showStoppedCars: {
					text: __('Show Stopped Drivers'),
					enabled: true
				},
				hLogoUrl: {
					text: __('Change Logo URL'),
					enabled: false
				}
			},
			position: {
				x: 1,
				y: 1
			}
		},
		progress: {
			id: 'progress',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 0.9099999999999999,
			name: __('Delta'),
			subSettings: {
				deltaText: {
					text: __('Delta text'),
					enabled: true
				},
				deltaBars: {
					text: __('Delta bars'),
					enabled: true
				},
				deltaNextPosition: {
					text: __('Next position'),
					enabled: true
				},
				estimatedLapTime: {
					text: __('Estimated lap time'),
					enabled: true
				},
				estimatedPosition: {
					text: __('Estimated position'),
					enabled: true
				},
				lastLap: {
					text: __('Last Lap'),
					enabled: true
				},
				sectorsAsTime: {
					text: __('Show Sectors as time'),
					enabled: true
				},
				deltaInRace: {
					text: __('Delta to Best-Lap in Race'),
					enabled: true
				},
				hideInRace: {
					text: __('Hide in race'),
					enabled: false
				}
			},
			position: {
				x: 87,
				y: -246
			}
		},
		tires: {
			id: 'tires',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.06,
			name: __('Tires'),
			subSettings: {
				showDetails: {
					text: __('Show Inner & Outer'),
					enabled: true
				},
				showTempNumbers: {
					text: __('Show Tire-Temp numbers'),
					enabled: true
				},
				showCelsius: {
					text: __('Tire-Temp in Celsius'),
					enabled: true
				},
				showWearNumbers: {
					text: __('Show Tire-Wear numbers'),
					enabled: true
				},
				showWearPerLap: {
					text: __('Show Tire-Wear per Lap'),
					enabled: true
				},
				showWearLaps: {
					text: __('Show Tire Est. Laps-Left'),
					enabled: true
				},
				showPressureNumbers: {
					text: __('Show Tire-Pressure numbers'),
					enabled: true
				},
				showPsi: {
					text: __('Tire-Pressure in PSI'),
					enabled: false
				}
			},
			position: {
				x: 5,
				y: 960
			}
		},
		fuelDetail: {
			id: 'fuelDetail',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 0.5999999999999996,
			name: __('Fuel & Lap Details'),
			subSettings: {
				showStoredInfo: {
					text: __('Show Lap Details'),
					enabled: true
				},
				showFuelTime: {
					text: __('Show Estimate Time'),
					enabled: true
				},
				clearAnySession: {
					text: __('Auto-Clear Data on Session-Change'),
					enabled: false
				},
				clearRaceSession: {
					text: __('Auto-Clear Data for Race-Session'),
					enabled: false
				},
				clearComboData: {
					text: __('Clear this Combo Stored Data'),
					enabled: false
				},
				clearAllData: {
					text: __('Clear all Stored Data'),
					enabled: false
				}
			},
			position: {
				x: 376,
				y: 962
			}
		},
		pitstop: {
			id: 'pitstop',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 0.6899999999999997,
			name: __('Pitstop'),
			subSettings: {
				pitWindow: {
					text: __('Show Pit-Window'),
					enabled: true
				},
				pitTimeOnly: {
					text: __('Show Pit-Time only'),
					enabled: false
				}
			},
			position: {
				x: 1412,
				y: 676
			}
		},
		spotting: {
			id: 'spotting',
			enabled: true,
			resetIt: false,
			volume: 0.5,
			zoom: 1.9400000000000008,
			name: __('Spotting / Radar'),
			subSettings: {
				shouldBeep: {
					text: __('Should beep'),
					enabled: true
				},
				beepVolume: {
					text: __('VOL:'),
					enabled: true
				},
				shouldOnlyBeep: {
					text: __('No Radar - Beep only'),
					enabled: false
				},
				warnFront: {
					text: __('Warn Front'),
					enabled: false
				},
				autoHide: {
					text: __('Auto Hide'),
					enabled: true
				}
			},
			position: {
				x: 825,
				y: 803
			}
		},
		motec: {
			id: 'motec',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.6300000000000006,
			name: __('Motec'),
			subSettings: {
				plBlink: {
					text: __('PitLimiter Blink'),
					enabled: true
				},
				plBBlink: {
					text: __('Background Blinking'),
					enabled: true
				},
				showECU: {
					text: __('Show Electronics'),
					enabled: true
				},
				showTCPercent: {
					text: __('Show TC in percent if available'),
					enabled: true
				},
				showMPH: {
					text: __('Speed in MPH'),
					enabled: false
				}
			},
			position: {
				x: 1745,
				y: 917
			}
		},
		/*performanceInfo: {
			id: 'performanceInfo',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1,
			name: __('Performance Info'),
			subSettings: {
				showAllTimeBest: {
					text: __('Show Alltime Best-Lap'),
					enabled: true
				},
				showSessionBest: {
					text: __('Show Session Best-Lap'),
					enabled: true
				},
				showSessionAverage: {
					text: __('Show Session Average-Lap'),
					enabled: true
				},
				showAvgSpeed: {
					text: __('Show Average Speed'),
					enabled: true
				},
				showPosGain: {
					text: __('Show Position Gain/Loss'),
					enabled: true
				}
			},
			position: {
				x: 960,
				y: 540
			}
		},*/
		cornerNames: {
			id: 'cornerNames',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 0.5299999999999998,
			name: __('Track Info'),
			subSettings: {
				trackDetails: {
					text: __('Track Name & Details'),
					enabled: true
				},
				corners: {
					text: __('Show Corner Names'),
					enabled: true
				},
				noColors: {
					text: __('Just-White'),
					enabled: true
				}
			},
			position: {
				x: 2,
				y: 892
			}
		},
		inputs: {
			id: 'inputs',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.6300000000000006,
			name: __('Inputs'),
			subSettings: {
				showInputNumbers: {
					text: __('Show Numbers'),
					enabled: true
				},
				steeringInput: {
					text: __('Steering wheel'),
					enabled: true
				}
			},
			position: {
				x: 1670,
				y: 917
			}
		},
		fuel: {
			id: 'fuel',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.6300000000000006,
			name: __('Fuel'),
			subSettings: {},
			position: {
				x: 1883,
				y: 917
			}
		},
		gforce: {
			id: 'gforce',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.1800000000000002,
			name: __('G-Force'),
			subSettings: {},
			position: {
				x: 1157,
				y: 962
			}
		},
		aids: {
			id: 'aids',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 0.95,
			name: __('Car assists'),
			subSettings: {},
			position: {
				x: 150,
				y: 962
			}
		},
		overtakingAids: {
			id: 'overtakingAids',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1,
			name: __('P2P/DRS'),
			subSettings: {},
			position: {
				x: 1669,
				y: 837
			}
		},
		startingLights: {
			id: 'startingLights',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 0.95,
			name: __('Race start lights'),
			subSettings: {},
			position: {
				x: 702,
				y: 227
			}
		},
		info: {
			id: 'info',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.3600000000000003,
			name: __('Race info'),
			subSettings: {},
			position: {
				x: 17,
				y: 408
			}
		},
		pitLimiter: {
			id: 'pitLimiter',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.6800000000000006,
			name: __('Pit limiter'),
			subSettings: {},
			position: {
				x: 820,
				y: 227
			}
		},
		damage: {
			id: 'damage',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.1500000000000001,
			name: __('Damage'),
			subSettings: {},
			position: {
				x: 367,
				y: 1098
			}
		},
		flags: {
			id: 'flags',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.4400000000000004,
			name: __('Flags'),
			subSettings: {},
			position: {
				x: 1218,
				y: 121
			}
		},
		crewChief: {
			id: 'crewChief',
			enabled: true,
			resetIt: false,
			volume: 0,
			zoom: 1.03,
			name: __('Crew Chief'),
			subSettings: {},
			position: {
				x: 1719,
				y: 273
			}
		},
		graphs: {
			id: 'graphs',
			enabled: false,
			resetIt: false,
			volume: 0,
			zoom: 1,
			name: __('Telemetry'),
			subSettings: {},
			position: {
				x: INVALID,
				y: INVALID
			}
		},
		clock: {
			id: 'clock',
			enabled: false,
			resetIt: false,
			volume: 0,
			zoom: 1.5000000000000004,
			name: __('Clock'),
			subSettings: {},
			position: {
				x: 1755,
				y: 140
			}
		}
	};

	@observable
	logoUrlEdit = false;

	@observable
	settingsOpacity = 0;

	@observable
	showSettings = false;

	@observable
	showRanking = false;

	@observable
	tempHide = false;

	@observable
	debugFilter = '';

	@observable
	appZoom = 1;

	@observable
	performanceTime = -1;

	@observable
	performance = -1;

	@observable
	performanceTick: number[] = [];

	@observable
	lastPerformance = -1;

	@observable
	lastRecordUpdate = 0;

	@observable
	nowTrackId = -1;

	@observable
	nowLayoutId = -1;

	@observable
	lastCheck = -1;

	@observable
	lastDiffCheck = 0;

	@observable
	updateDiffs = true;

	@observable
	tempLowPerfo = false;
	@observable
	tempHighPerfo = false;
	@observable
	tempSavePerfo: boolean[] = [];

	@observable
	debugData: IShared | null = null;

	@observable
	resetString = _('Reset Settings');

	@observable
	nowDriverDataSize = -1;

	@observable
	forceCheck = false;

	@observable
	lastDriverDataSize = -1;

	@observable
	slowDiff = -1;

	@observable
	lapStartTime = -1;

	@observable
	oneRefresh = false;

	currentCursorWidgetOffset: null | {
		x: number;
		y: number;
		id: string;
	} = null;

	@observable
	parseRankingDataTimeout = INVALID;

	@observable
	sessionType = -1;

	@observable
	sessionPhase = -1;

	@observable
	singleplayerRace = false;

	@observable
	bestLapTimeLeader = -1;

	@observable
	lapTimeCurrentSelf = -1;

	@observable
	lapDistance = -1;

	@observable
	layoutLength = -1;

	@observable
	lapTimePreviousSelf = -1;

	@observable
	tractionControlPercentUndefined = true;

	@observable
	pitStoppedTime = -1;

	@observable
	rankingUrl = '';

	updateFunction: Function | null = null;

	constructor(props: IProps) {
		super(props);

		// If version isn't defined we aren't in game
		if (!window.version) {
			(document.body.parentNode as any)!.classList.add('debug');
		}

		this.handleResize();
		this.recoverSettings();

		setLocale(this.language);
		lowPerformanceMode = this.lowPerfo;
		highPerformanceMode = this.highPerfo;
		showAllMode = this.showAll;
		hideWidgets = this.hide || this.tempHide;
		blockFuelCalc = this.elBlocko;
		speedInMPH = this.mphSpeed;
		eDriverNum = this.driverNum;
		eRankInvert = this.rankInvert;
		eRankInvertRelative = this.rankInvertRelative;
		eLogoUrl = this.hLogoUrl;

		// if (localStorage.theError !== undefined) {
			// this.theError = localStorage.theError;
		// }

		// Deal with errors by clearing app settings, hopefully it solves the issue...
		window.onerror = () => { /* (msg, url, lineNo, columnNo, error) => {
			showDebugMessage(`waaaaaaaaaaaaaaaaaaaaaaaaaaah! ${
				msg
			} ${
				url
			} ${
				lineNo
			} ${
				columnNo
			} ${
				error
			}`);
			showDebugMessage('waaaaaaaaaaaaaaaaaaaaaaaaaaah!');*/
			// delete localStorage.appSettings;
			setTimeout(() => {
				window.location.reload(true);
			}, 1000);
			// console.log('Waaaaaaaaaaaaaaaaaaaaaaaaaaaaaaah!');
		};

		/* window.onerror = () => {
			delete localStorage.appSettings;

			setTimeout(() => {
				window.location.reload(true);
			}, 3000);
		}; */
		registerUpdate(this.updatePerformance);
	}

	componentDidMount() {
		window.addEventListener('keypress', this.onKeyPress);
		window.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);
		window.addEventListener('resize', this.handleResize);
		window.addEventListener('keyup', this.showKey);
		window.addEventListener('keydown', this.shiftKeyDown);
		window.addEventListener('keyup', this.shiftKeyUp);
		document.addEventListener('paste', this.handlePaste);
	}

	componentWillUnmount() {
		window.removeEventListener('keypress', this.onKeyPress);
		window.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
		window.removeEventListener('resize', this.handleResize);
		window.removeEventListener('keyup', this.showKey);
		window.removeEventListener('keydown', this.shiftKeyDown);
		window.removeEventListener('keyup', this.shiftKeyUp);
		document.removeEventListener('paste', this.handlePaste);
		unregisterUpdate(this.updatePerformance);
	}

	@action
	private handlePaste = (event: ClipboardEvent) => {
		if (!event.clipboardData) { return; }
		const clipText = event.clipboardData.getData('Text');
		const isSettings = clipText.includes('positionBar');
		if (isSettings) {
			let savedSettings = {};
			savedSettings = JSON.parse(clipText);
			let hasFaulty = false;
			Object.keys(savedSettings).forEach((key) => {
				if (!Object.prototype.hasOwnProperty.call(this.settings, key)) {
					hasFaulty = true;
				}
				Object.keys(savedSettings[key].subSettings).forEach((keya) => {
					if (!Object.prototype.hasOwnProperty.call(
						this.settings[key].subSettings, keya)
					) {
						hasFaulty = true;
					}
				});
			});
			if (hasFaulty) {
				showDebugMessage(
					_('Received Layout-Settings: [ERROR] Data was corrupt'),
					5000
				);
			} else {
				this.settings = merge(this.settings, savedSettings);
				showDebugMessage(
					_('Received Layout-Settings: Saved to Layout') + ` ${this.currentLayout}`,
					5000
				);
				setTimeout(this.timerSaveSettings, 3000);
			}
		}
	};

	@action
	private updatePerformance = () => {
		this.gameInReplay = r3e.data.GameInReplay > 0;
		this.gameInMenus = r3e.data.GameInMenus > 0;
		const showAtAll =
			r3e.data &&
			!this.gameInMenus &&
			r3e.data.DriverData.length > 0;
		const driverDataPlace =
			r3e.data
			?	r3e.data.DriverData
				?	r3e.data.DriverData[0]
					?	r3e.data.DriverData[0].Place
					:	-1
				:	-1
			:	-1;

		getSlotIds();

		this.playerSlotId = ePlayerSlotId;
		this.playerDriverDataIndex = ePlayerDriverDataIndex;
		this.playerIsFocus = ePlayerIsFocus;
		this.currentSlotId = eCurrentSlotId;
		this.sessionType = r3e.data.SessionType;
		this.sessionPhase = r3e.data.SessionPhase;
		this.bestLapTimeLeader = r3e.data.SectorTimesSessionBestLap.Sector3;
		this.lapTimeCurrentSelf = r3e.data.LapTimeCurrentSelf;
		this.lapDistance = r3e.data.LapDistance;
		this.layoutLength = r3e.data.LayoutLength;
		this.lapTimePreviousSelf = r3e.data.LapTimePreviousSelf;
		this.tractionControlPercentUndefined = r3e.data.TractionControlPercent === undefined;

		if (!eIsIngameBrowser) {
			if (
				!showAtAll ||
				this.gameInMenus ||
				(
					this.gameInReplay &&
					(
						driverDataPlace === -1 ||
						this.sessionType !== 2
					) &&
					this.playerDriverDataIndex === -1
				)
			) {
				this.oneRefresh = true;
			} else if (this.oneRefresh) {
				this.oneRefresh = false;
				this.hide = true;
				window.location.reload(true);
			}
		}

		if (this.rankingUrl === '' && localStorage.userId !== undefined) {
			this.rankingUrl = `https://game.raceroom.com/de/users/${localStorage.userId}/career`;
			// this.rankingUrl = `https://game.raceroom.com/de/users/stradivar/career`;
		}

		if (localStorage.language === undefined) {
			localStorage.language = 'en';
		}
		if (localStorage.lockHudStatus === undefined) {
			localStorage.lockHudStatus = '0';
			this.lockHud = false;
		}
		if (r3e.data.ControlType === EControl.Player) {
			this.throttlePedal = r3e.data.ThrottleRaw;
			this.brakePedal = r3e.data.BrakeRaw;
			this.clutchPedal = r3e.data.ClutchRaw;
		} else {
			this.throttlePedal = r3e.data.Throttle;
			this.brakePedal = r3e.data.Brake;
			this.clutchPedal = r3e.data.Clutch;
		}
		if (
			this.changeLogToggled ||
			(
				!this.changeLogRead &&
				(
					this.gameInReplay ||
					this.clutchPedal > 0.1 ||
					this.brakePedal > 0.1 ||
					this.throttlePedal > 0.1
				)
			)
		) {
			this.changeLogRead = !this.changeLogRead;
			localStorage.changeLogRead = this.changeLogRead ? '1' : '0';
			this.changeLogToggled = false;
		}
		if (localStorage.changeLogRead === undefined) {
			localStorage.changeLogRead = '0';
			this.changeLogRead = false;
		} else {
			this.changeLogRead = localStorage.changeLogRead === '1';
		}
		if (localStorage.currentVersion === undefined) {
			localStorage.currentVersion = '0';
			this.storedVersion = 0;
		} else {
			this.storedVersion = parseFloat(localStorage.currentVersion);
		}
		if (this.storedVersion !== currentVersion) {
			localStorage.changeLogRead = '0';
			this.changeLogRead = false;
			localStorage.currentVersion = currentVersion.toString();
		}
		// localStorage.changeLogRead = '0';
		this.forceCheck = false;
		this.nowDriverDataSize = r3e.data.DriverData.length;
		const driverSizeDiff =
			Math.abs(this.nowDriverDataSize - this.lastDriverDataSize);
		if (driverSizeDiff > 0 && driverSizeDiff < 10) {
			this.lastDriverDataSize = this.nowDriverDataSize;
			this.forceCheck = true;
		}
		this.currentNumDrivers = r3e.data.NumCars;

		if (localStorage.stateJson) {
			showDebugMessage(
				_(`UI is paused! Press SHIFT+SPACEBAR to Unpause`),
				1000,
				-1
			);
		}
		if (showAllMode) {
			showDebugMessage(
				_(`Widgets-TEST-Mode Active!
				Disable in Settings or press SHIFT+DOWNARROW`),
				1000,
				-1
			);
		}
		if (this.enterPressed) {
			this.hLogoUrl = this.hLogoUrl === 'none' || this.hLogoUrl === ''
				?	'./../../img/logo.png'
				:	this.hLogoUrl;
			eLogoUrl = this.hLogoUrl;
			if (this.currentLayout === 1) {
				localStorage.currentLogo = this.hLogoUrl;
			} else if (this.currentLayout === 2) {
				localStorage.currentLogo2 = this.hLogoUrl;
			} else if (this.currentLayout === 3) {
				localStorage.currentLogo3 = this.hLogoUrl;
			}
			this.enterPressed = false;
			this.settings.tvTower.subSettings.hLogoUrl.enabled = false;
			this.logoUrlEdit = false;
			this.saveSettings();
		}

		if (eResetId !== '') {
			const setting = this.settings[eResetId];
			const defaultSettings = this.defaultsettings[eResetId];
			setting.position.x = defaultSettings.position.x;
			setting.position.y = defaultSettings.position.y;
			setting.volume = defaultSettings.volume;
			setting.zoom = defaultSettings.zoom;

			Object.keys(setting.subSettings).forEach((keya) => {
				const subSetting = setting.subSettings[keya];
				const defaultSubSetting = defaultSettings.subSettings[keya];
				subSetting.enabled = defaultSubSetting.enabled;
			});

			if (eResetId === 'tvTower') {
				this.hLogoUrl = './../../img/logo.png';
				eLogoUrl = this.hLogoUrl;
				if (this.currentLayout === 1) {
					localStorage.currentLogo = this.hLogoUrl;
				} else if (this.currentLayout === 2) {
					localStorage.currentLogo2 = this.hLogoUrl;
				} else if (this.currentLayout === 3) {
					localStorage.currentLogo3 = this.hLogoUrl;
				}
				if (this.rankInvert) {
					this.toggleRankInvert();
				}
			}
			if (eResetId === 'positionBarRelative') {
				if (this.rankInvertRelative) {
					this.toggleRankInvertRelative();
				}
				if (this.driverNum !== 3) {
					this.driverNumTo3();
				}
			}
			this.enterPressed = false;
			this.settings.tvTower.subSettings.hLogoUrl.enabled = false;
			this.logoUrlEdit = false;
			eResetId = '';
			this.saveSettings();
		}

		const diff = nowCheck - this.lastPerformance;
		if (diff <= 1000) {
			this.performanceTick.push(
				nowCheck -
				this.performanceTime
			);
		}
		if (diff > 1000) {
			let sum = 0;
			const aL = this.performanceTick.length;
			this.performanceTick.forEach((tick) => {
					sum += tick;
				}
			);
			this.performance = Math.round((1000 / (sum / aL)) * 10) / 10;
			this.lastPerformance = nowCheck;
			this.performanceTick = [];
		}
		this.performanceTime = nowCheck;
		if (
			!this.tempHighPerfo &&
			r3e.data.StartLights > -1 &&
			r3e.data.StartLights < 6
		) {
			this.tempHighPerfo = true;
			this.tempSavePerfo[0] = lowPerformanceMode;
			this.tempSavePerfo[1] = highPerformanceMode;
			highPerformanceMode = false;
			lowPerformanceMode = false;
			supremePerformance = true;
		}
		if (
			this.tempHighPerfo &&
			(
				r3e.data.StartLights >= 6 ||
				r3e.data.StartLights === -1)
		) {
			this.tempHighPerfo = false;
			lowPerformanceMode = this.tempSavePerfo[0];
			highPerformanceMode = this.tempSavePerfo[1];
			supremePerformance = false;
		}

		if (this.nowTrackId !== r3e.data.TrackId) {
			this.nowTrackId = -1;
		}
		if (this.nowLayoutId !== r3e.data.LayoutId) {
			this.nowLayoutId = -1;
		}
		if (this.nowTrackId === -1) {
			this.trackingString = '';
			if (r3e.data.TrackId !== -1) {
				this.nowTrackId = r3e.data.TrackId;
				this.nowLayoutId = r3e.data.LayoutId;
				this.tempTrackingString = `${
					r3e.data.TrackId
				}_${
					r3e.data.LayoutId
				}_7982`;
				this.tempClassLapData = getRecordedLapsData(this.tempTrackingString);
				this.driverRecordedLaps = getRecordedLapsData(this.tempTrackingString);
				this.forceCheck = true;
			}
		}

		this.updateDiffs = false;
		if (
			(nowCheck - this.lastDiffCheck) >= 500 ||
			this.forceCheck
		) {
			this.updateDiffs = true;
			this.lastDiffCheck = nowCheck;
		}

		if (
			(
				highPerformanceMode &&
				nowCheck - this.lastCheck >= 16
			) ||
			(
				lowPerformanceMode &&
				nowCheck - this.lastCheck >= 66
			) ||
			(
				!lowPerformanceMode &&
				!highPerformanceMode &&
				nowCheck - this.lastCheck >= 33
			) ||
			this.updateDiffs
		) {
			// showDebugMessageSmall(`${this.trackingString}`);
			this.singleplayerRace = false;
			this.lastCheck = nowCheck;

			const driverData = r3e.data.DriverData.map(this.formatDriverData);
			this.drivers = driverData.map((driver) => {
				return driver;
			});
			if (
				(
					this.currentNumDrivers !== this.lastNumDrivers ||
					this.lastNumDrivers === 0
				) &&
				this.drivers.length &&
				!this.singleplayerRace
			) {
				this.lastNumDrivers = this.currentNumDrivers;
				getJason();
			}
			if (
				!this.singleplayerRace &&
				rankData.length <= 0 &&
				this.parseRankingDataTimeout === INVALID
			) {
				this.parseRankingDataTimeout = setTimeout(this.parseRankingData, 5000);
			}
			eIsLeaderboard = r3e.data.SessionLengthFormat === -1 &&
				r3e.data.RaceSessionMinutes.Race1 === -1 &&
				r3e.data.RaceSessionMinutes.Race2 === -1 &&
				r3e.data.RaceSessionMinutes.Race3 === -1 &&
				r3e.data.RaceSessionLaps.Race1 === -1 &&
				r3e.data.RaceSessionLaps.Race2 === -1 &&
				r3e.data.RaceSessionLaps.Race3 === -1 &&
				r3e.data.SessionTimeDuration === -1 &&
				r3e.data.SessionTimeRemaining === -1;
			eIsHillClimb = r3e.data.LayoutId === 1682 ||
				r3e.data.LayoutId === 1709 ||
				r3e.data.LayoutId === 2181 ||
				r3e.data.LayoutId === 2214;

			// this.runBooboo();
			this.getClassBestLaps(this.drivers);
			this.updateDriverTimes();
			this.updateLapRecordTimes();
		}
		/* showDebugMessage(
			`StartIndexPlayer: ${this.startIndexPlayer}
			HigherThenHalf: ${isHigherThenHalf ? 'yes' : 'no'}
			StartIndex: ${startIndex}
			`
		);*/
	}

	private runBooboo() {
		if (
			!r3e.data ||
			!this.drivers.length ||
			r3e.data.NumCars !== this.drivers.length ||
			this.sessionType !== 2 ||
			(this.sessionType === 2 && this.sessionPhase !== 5)
		) { return; }
		const lId = r3e.data.LayoutId.toString();
		if (this.pitBoxDistances[lId] === undefined) {
			let newSet = false;
			let storedData: IPitBoxDistances = {};
			if (localStorage.PitBoxDistances) {
				storedData = JSON.parse(localStorage.PitBoxDistances);
			}
			if (storedData[lId] === undefined) {
				newSet = true;
				storedData[lId] = {};
			}
			this.pitBoxDistances = merge(this.pitBoxDistances, storedData);
			if (newSet) {
				localStorage.PitBoxDistances =
					JSON.stringify(this.pitBoxDistances, null, '  ');
			}
		}
		if (this.pitBoxEntrances[lId] === undefined) {
			let newSet = false;
			let storedData: IPitBoxEntrances = {};
			if (localStorage.PitBoxEntrances) {
				storedData = JSON.parse(localStorage.PitBoxEntrances);
			}
			if (storedData[lId] === undefined) {
				newSet = true;
				storedData[lId] = -1;
			}
			this.pitBoxEntrances = merge(this.pitBoxEntrances, storedData);
			if (newSet) {
				localStorage.PitBoxEntrances =
					JSON.stringify(this.pitBoxEntrances, null, '  ');
			}
		}
		if (this.pitBoxDistances[lId] !== undefined) {
			let needStoring = false;
			let needStoringA = false;
			const checkNow = (nowCheck - this.pitStoppedTime) >= 1000;
			if (checkNow) { this.pitStoppedTime = nowCheck; }
			this.drivers.forEach((driver) => {
				if (
					driver.pitting &&
					driver.finishStatus === 0 &&
					this.pitBoxEntrances[lId] === -1
				) {
					this.pitBoxEntrances[lId] = driver.lapDistance;
					needStoringA = true;
				}
				const dId = driver.id.toString();
				if (checkNow) {
					if (this.lastPosition[dId] === undefined) {
						this.lastPosition[dId] = {
							X: -1,
							Y: -1,
							Z: -1
						};
					}
					const lastPos = this.lastPosition[dId].X + this.lastPosition[dId].Z;
					const nowPos = driver.dPos.X + driver.dPos.Z;
					const stillGoing = Math.abs(lastPos - nowPos) > 0.002;
					if (
						!stillGoing &&
						this.pitBoxDistances[lId][dId] === undefined &&
						driver.pitting &&
						driver.finishStatus === 0
					) {
						showDebugMessageSmall(
							`Saved Spot for: ${
								driver.id
							}`, 1000
						);
						needStoring = true;
						this.pitBoxDistances[lId][dId] = driver.dPos;
					}
					this.lastPosition[dId] = driver.dPos;
				}
			});
			if (needStoring) {
				localStorage.PitBoxDistances = JSON.stringify(this.pitBoxDistances, null, '  ');
			}
			if (needStoringA) {
				localStorage.PitBoxEntrances = JSON.stringify(this.pitBoxEntrances, null, '  ');
			}
		}
	}

	private formatDriverData = (driver: IDriverData): IDriverInfo => {
		const isUser =
			this.currentSlotId === driver.DriverInfo.SlotId;
		if (driver.DriverInfo.UserId === -1) { this.singleplayerRace = true; }
		const driverData = {
			isUser,
			id: driver.DriverInfo.SlotId,
			userId: driver.DriverInfo.UserId,
			engineState: driver.EngineState,
			name: base64ToString(driver.DriverInfo.Name),
			modelId: driver.DriverInfo.ModelId,
			currentTime: driver.LapTimeCurrentSelf,
			validLap: driver.CurrentLapValid,
			performanceIndex: driver.DriverInfo.ClassPerformanceIndex,
			bestLapTime: driver.SectorTimeBestSelf.Sector3,
			bestLapTimeLeader: this.bestLapTimeLeader,
			bestLapTimeClass:
				this.classBestLap[driver.DriverInfo.ClassPerformanceIndex] !== undefined
				?	this.classBestLap[driver.DriverInfo.ClassPerformanceIndex]
				:	9999,
				/* this.getBestLapClass(
					this.drivers,
					driver.DriverInfo.ClassPerformanceIndex
				), */
			pitting: driver.InPitlane,
			classId: driver.DriverInfo.ClassId,
			classColor: getClassColor(driver.DriverInfo.ClassPerformanceIndex),
			lapDistance: driver.LapDistance,
			finishStatus: this.gameInReplay &&
				driver.InPitlane &&
				this.driverPitInfo[driver.DriverInfo.SlotId] !== undefined &&
				Math.abs(this.driverPitInfo[driver.DriverInfo.SlotId][2] - this.driverPitInfo[driver.DriverInfo.SlotId][3]) < 2000 &&
				driver.EngineState === 0
				?	2
				:	driver.FinishStatus,
			speed: driver.CarSpeed,
			lapPrevious: driver.SectorTimePreviousSelf.Sector3,
			distDiff: isUser
				?	0
				:	driver.InPitlane
					?	0
					:	0, // this.getGapToPlayer(driver.LapDistance),
			timeDiff: isUser
				?	0
				:	this.driverRecordedLaps !== undefined
					?	this.driverRecordedLaps[0][0] !== -1
						?	this.updateDiffs
							?	this.getTimeToPlayer(driver.LapDistance)
							:	this.getLastTimeDiff(this.drivers, driver.DriverInfo.SlotId)
						:	0
					:	0,
			dPos: driver.Position
		};
		return driverData;
	};

	private getLapDiff(lapDist: number): number {
		if (
			lapDist === INVALID ||
			this.lapStartTime === -1
		) {
			return -1;
		}
		let startIndexPlayer = -1;
		const userLapDistance = lapDist;
		this.driverRecordedLaps[2]
		.forEach((dist, i) => {
			if (dist >= userLapDistance && startIndexPlayer === -1) {
				startIndexPlayer = (i - 1);
			}
		});
		const lapTime = this.lapTimeCurrentSelf !== -1
		?	this.lapTimeCurrentSelf * 1000
		:	nowCheck - this.lapStartTime;
		const diff =
			this.driverRecordedLaps[3][startIndexPlayer] -
			(lapTime / 1000);
		const rounded = Math.round(diff  * 10) / 10;
		showDebugMessageSmall(`${diff} / ${rounded}`);
		return rounded;
	}

	private getTimeToPlayer(lapDist: number): number {
		if (lapDist === INVALID) {
			return 0;
		}
		let startIndexTarget = -1;
		let startIndexPlayer = -1;
		const userLapDistance = this.lapDistance;
		const aLength = this.playerIsFocus
			?	this.driverRecordedLaps[3].length
			:	this.tempClassLapData[3].length;
		if (this.playerIsFocus) {
			this.driverRecordedLaps[2]
			.forEach((dist, i) => {
				if (dist >= lapDist && startIndexTarget === -1) {
					startIndexTarget = (i - 1);
				}
				if (dist >= userLapDistance && startIndexPlayer === -1) {
					startIndexPlayer = (i - 1);
				}
			});
			if (startIndexTarget > -1) {
				const lapTime =
					this.driverRecordedLaps[3][(aLength - 1)];
				/*let diff = userLapDistance - lapDist;
				if (diff < -(this.layoutLength / 2)) {
					diff = diff + this.layoutLength;
				}
				if (diff > (this.layoutLength / 2)) {
					diff = diff - this.layoutLength;
				}*/
				let diff =
					this.driverRecordedLaps[3][startIndexPlayer] -
					this.driverRecordedLaps[3][startIndexTarget];
				if (diff < -(lapTime / 2)) {
					diff = diff + lapTime;
				}
				if (diff > (lapTime / 2)) {
					diff = diff - lapTime;
				}
				if (diff < 0) {
					if (startIndexTarget < startIndexPlayer) {
						return 0 - (
							(
								lapTime -
								this.driverRecordedLaps[3][startIndexPlayer]
							) +
							this.driverRecordedLaps[3][startIndexTarget]
						);
					}
					return 0 - (
						this.driverRecordedLaps[3][startIndexTarget] -
						this.driverRecordedLaps[3][startIndexPlayer]
					);
				}
				if (diff > 0) {
					if (startIndexPlayer < startIndexTarget) {
						return (
							(
								lapTime -
								this.driverRecordedLaps[3][startIndexTarget]
							) +
							this.driverRecordedLaps[3][startIndexPlayer]
						);
					}
					return (
						this.driverRecordedLaps[3][startIndexPlayer] -
						this.driverRecordedLaps[3][startIndexTarget]
					);
				}
			}
		} else {
			this.tempClassLapData[2]
			.forEach((dist, i) => {
				if (dist >= lapDist && startIndexTarget === -1) {
					startIndexTarget = (i - 1);
				}
				if (dist >= userLapDistance && startIndexPlayer === -1) {
					startIndexPlayer = (i - 1);
				}
			});
			if (startIndexTarget > -1) {
				const lapTime =
					this.tempClassLapData[3][(aLength - 1)];
				/*let diff = userLapDistance - lapDist;
				if (diff < -(this.layoutLength / 2)) {
					diff = diff + this.layoutLength;
				}
				if (diff > (this.layoutLength / 2)) {
					diff = diff - this.layoutLength;
				}*/
				let diff =
					this.tempClassLapData[3][startIndexPlayer] -
					this.tempClassLapData[3][startIndexTarget];
				if (diff < -(lapTime / 2)) {
					diff = diff + lapTime;
				}
				if (diff > (lapTime / 2)) {
					diff = diff - lapTime;
				}
				if (diff < 0) {
					if (startIndexTarget < startIndexPlayer) {
						return 0 - (
							(
								lapTime -
								this.tempClassLapData[3][startIndexPlayer]
							) +
							this.tempClassLapData[3][startIndexTarget]
						);
					}
					return 0 - (
						this.tempClassLapData[3][startIndexTarget] -
						this.tempClassLapData[3][startIndexPlayer]
					);
				}
				if (diff > 0) {
					if (startIndexPlayer < startIndexTarget) {
						return (
							(
								lapTime -
								this.tempClassLapData[3][startIndexTarget]
							) +
							this.tempClassLapData[3][startIndexPlayer]
						);
					}
					return (
						this.tempClassLapData[3][startIndexPlayer] -
						this.tempClassLapData[3][startIndexTarget]
					);
				}
			}
		}
		return 0;
	}

	private getGapToPlayer(lapDist: number): number {
		if (lapDist === INVALID) {
			return 0;
		}
		const trackDist = this.layoutLength;
		const playerDist = this.lapDistance;
		let distToPlayer = playerDist - lapDist;

		if (distToPlayer < -(trackDist / 2)) {
			distToPlayer = distToPlayer + trackDist;
		}
		if (distToPlayer > (trackDist / 2)) {
			distToPlayer = distToPlayer - trackDist;
		}
		return parseInt((distToPlayer * -1).toFixed(0), 10);
	}

	private getLastTimeDiff = (driverData: IDriverInfo[], searchId: number) => {
		let blob = -100;
		driverData.forEach((driver) => {
			if (driver.id === searchId) {
				blob = driver.timeDiff;
			}
		});
		return blob;
	}

	private getClassBestLaps = (driverData: IDriverInfo[]) => {
		driverData.forEach(
			(driver) => {
				if (this.classBestLap[driver.performanceIndex] === undefined) {
					this.classBestLap[driver.performanceIndex] = 9999;
				} else if (
						driver.bestLapTime > 0 &&
						driver.bestLapTime <= this.classBestLap[driver.performanceIndex]
				) {
					this.classBestLap[driver.performanceIndex] = driver.bestLapTime;
				}
			}
		);
	}

	private getBestLapClass = (driverData: IDriverInfo[], classId: number) => {
		let bestLap = 99999;
		driverData.forEach((driver) => {
				if (
					driver.performanceIndex === classId &&
					driver.bestLapTime > 0 &&
					driver.bestLapTime <= bestLap
				) {
					bestLap = driver.bestLapTime;
				}
			}
		);
		return bestLap;
	};

	private updateDriverTimes() {
		if (!this.drivers.length) {
			return;
		}
		const newDiffs: IDriverDiffs = {};
		this.drivers.forEach((driver) => {
			newDiffs[driver.id] = [
				[this.driverRecordedLaps[0][0]],
				[driver.timeDiff],
				[-1] // this.getLapDiff(driver.lapDistance)
			];
			if (
				this.sessionType === ESession.Race &&
				this.driverPitInfo[driver.id] !== undefined
			) {
				// Was in Pits on Start
				if (this.driverPitInfo[driver.id][1] < 0 && driver.pitting === 0) {
					this.driverPitInfo[driver.id][1] = 0;
					this.driverPitInfo[driver.id][0] = 0;
					return;
				}

				// Re-Enters pits
				if (
					this.driverPitInfo[driver.id][1] > 0 &&
					this.driverPitInfo[driver.id][0] === 0 &&
					driver.pitting
				) {
					this.driverPitInfo[driver.id][2] = nowCheck;
					this.driverPitInfo[driver.id][3] = -1;
					this.driverPitInfo[driver.id][4] = -1;
					this.driverPitInfo[driver.id][5] = -1;
				}
				// Enters the Pit
				if (
					this.driverPitInfo[driver.id][0] === 0 &&
					this.driverPitInfo[driver.id][1] !== -1 &&
					driver.pitting &&
					driver.finishStatus === 0
				) {
					this.driverPitInfo[driver.id][0] = 1;
					this.driverPitInfo[driver.id][2] = nowCheck;
				}

				// Stops on Spot
				if (
					this.driverPitInfo[driver.id][0] > 0 &&
					this.driverPitInfo[driver.id][3] < 0 &&
					driver.pitting &&
					driver.finishStatus === 0 &&
					(
						driver.speed <= 0.05 ||
						driver.speed.toString().indexOf('E') > -1
					)
				) {
					this.driverPitInfo[driver.id][3] = nowCheck;
				}

				// Starts from Spot
				if (
					this.driverPitInfo[driver.id][0] > 0 &&
					this.driverPitInfo[driver.id][3] > 0 &&
					this.driverPitInfo[driver.id][4] < 0 &&
					driver.pitting &&
					driver.finishStatus === 0 &&
					driver.speed >= 1 &&
					driver.speed.toString().indexOf('E') < 0
				) {
					this.driverPitInfo[driver.id][4] = nowCheck;
				}

				// Stops again before exit! Miss-Spot?
				if (
					this.driverPitInfo[driver.id][0] > 0 &&
					this.driverPitInfo[driver.id][3] > 0 &&
					this.driverPitInfo[driver.id][4] > 0 &&
					driver.pitting &&
					driver.finishStatus === 0 &&
					(
						driver.speed <= 0.05 ||
						driver.speed.toString().indexOf('E') > -1
					)
				) {
					this.driverPitInfo[driver.id][4] = -1;
				}

				// Exits Pits
				if (
					this.driverPitInfo[driver.id][0] > 0 &&
					!driver.pitting &&
					this.driverPitInfo[driver.id][5] < 0 &&
					driver.finishStatus === 0
				) {
					this.driverPitInfo[driver.id][0] = 0;
					this.driverPitInfo[driver.id][5] = nowCheck;
					this.driverPitInfo[driver.id][1]++;
				}
			} else {
				this.driverPitInfo[driver.id] = [
					0,
					-1,
					-1,
					-1,
					-1,
					-1
				];
			}
			if (this.driverLapInfo[driver.id] !== undefined) {
				if (driver.finishStatus < 1) {
					if (
						(nowCheck - this.driverLapInfo[driver.id][2]) > 10500 &&
						driver.lapDistance < 101 &&
						driver.lapDistance > 5
					) {
						this.driverLapInfo[driver.id][0] = driver.lapPrevious;
						this.driverLapInfo[driver.id][1] = driver.lapPrevious <= 0
							?	-999
							:	driver.lapPrevious;
						this.driverLapInfo[driver.id][2] = nowCheck + 10000;
					}
					if (
						driver.lapPrevious <= 0 ||
						this.driverLapInfo[driver.id][1] === -999
					) {
						this.driverLapInfo[driver.id][3] = 255;
						this.driverLapInfo[driver.id][4] = 60;
						this.driverLapInfo[driver.id][5] = 0;
						this.driverLapInfo[driver.id][6] = 1;
					} else if (
						driver.lapPrevious <= driver.bestLapTimeLeader && !this.gameInReplay
					) {
						this.driverLapInfo[driver.id][3] = 179;
						this.driverLapInfo[driver.id][4] = 102;
						this.driverLapInfo[driver.id][5] = 179;
						this.driverLapInfo[driver.id][6] = 1;
					} else if (
						driver.lapPrevious <= driver.bestLapTimeClass && !this.gameInReplay
					) {
						const classColor = hSLToRGB(driver.classColor, 1);
						this.driverLapInfo[driver.id][3] = Math.round(classColor.r);
						this.driverLapInfo[driver.id][4] = Math.round(classColor.g);
						this.driverLapInfo[driver.id][5] = Math.round(classColor.b);
						this.driverLapInfo[driver.id][6] = 1;
					} else if (
						driver.lapPrevious <= driver.bestLapTime &&
						driver.bestLapTime > 0 && !this.gameInReplay
					) {
						this.driverLapInfo[driver.id][3] = 0;
						this.driverLapInfo[driver.id][4] = 190;
						this.driverLapInfo[driver.id][5] = 60;
						this.driverLapInfo[driver.id][6] = 1;
					} else {
						this.driverLapInfo[driver.id][3] = 0;
						this.driverLapInfo[driver.id][4] = 150;
						this.driverLapInfo[driver.id][5] = 190;
						this.driverLapInfo[driver.id][6] = 1;
					}
				} else {
					this.driverLapInfo[driver.id] = [
						-1,
						-1,
						-1,
						-1,
						190,
						60,
						1
					];
				}
			} else {
				this.driverLapInfo[driver.id] = [
					-1,
					-1,
					-1,
					-1,
					190,
					60,
					1
				];
			}
		});
		eDriverLapInfo = this.driverLapInfo;
		eDriverPitInfo = this.driverPitInfo;
		eDriverDiffs = newDiffs;
	}

	private updateLapRecordTimes() {
		let checkNeeded = false;
		if (
			(
				highPerformanceMode &&
				nowCheck - this.lastRecordUpdate >= 15
			) ||
			(
				lowPerformanceMode &&
				nowCheck - this.lastRecordUpdate >= 66
			) ||
			(
				!lowPerformanceMode &&
				!highPerformanceMode &&
				nowCheck - this.lastRecordUpdate >= 32
			)
		) {
			checkNeeded = true;
			this.lastRecordUpdate = nowCheck;
		}
		if (!checkNeeded) {
			return;
		}
		if (!this.drivers.length) {
			return;
		}
		let needStoring = false;
		this.drivers.forEach((driver) => {
			if (this.driverLapRecord[driver.id] !== undefined) {
				if (
					driver.finishStatus < 1 &&
					driver.currentTime >= 0 &&
					driver.validLap &&
					driver.pitting < 1 &&
					(
						this.playerSlotId !== -1 &&
						driver.id === this.playerSlotId
					)
				) {
					let aLength = this.driverLapRecord[driver.id][0].length;
					const storeTime = driver.lapPrevious > 0
						?	driver.lapPrevious
						:	this.lapTimePreviousSelf > 0
							?	this.lapTimePreviousSelf
							:	0;
					if (
						(nowCheck - this.driverLapRecord[driver.id][2][0]) > 5500 &&
						driver.lapDistance < 51 &&
						driver.lapDistance > 2 &&
						storeTime > 0
					) {
						if (aLength > 10 && this.driverLapRecord[driver.id][0][1] < 100) {
							this.driverLapRecord[driver.id][0].push(this.layoutLength);
							this.driverLapRecord[driver.id][1].push(storeTime);
							if (
								this.playerSlotId === driver.id &&
								(
									this.driverRecordedLaps[0][0] === -1 ||
									this.driverRecordedLaps[0][0] > storeTime ||
									this.driverRecordedLaps[1][0] === 0
								)
							) {
								this.driverRecordedLaps[0][0] =
									storeTime;
								this.driverRecordedLaps[1][0] =
									1;
								this.driverRecordedLaps[2] =
									this.driverLapRecord[driver.id][0].map((x) => x);
								this.driverRecordedLaps[3] =
									this.driverLapRecord[driver.id][1].map((x) => x);

								let tString = '';
								if (
									r3e.data.TrackId !== -1 &&
									r3e.data.LayoutId !== -1 &&
									driver.classId !== -1
								) {
									tString = `${
										r3e.data.TrackId
									}_${
										r3e.data.LayoutId
									}_${
										driver.classId
									}`;
								}
								if (tString !== '') {
									this.storedRecordedLaps[tString] =
										this.driverRecordedLaps;
									needStoring = false; // true;
								}
							}
						}
						this.driverLapRecord[driver.id][0] = [0];
						this.driverLapRecord[driver.id][1] = [0];
						this.driverLapRecord[driver.id][0].push(driver.lapDistance);
						this.driverLapRecord[driver.id][1].push(driver.currentTime);
						this.driverLapRecord[driver.id][2][0] = nowCheck + 5000;
						aLength = 2;
						this.lapStartTime = -1;
					}
					if (
						aLength &&
						driver.lapDistance > this.driverLapRecord[driver.id][0][(aLength - 1)]
					) {
						this.driverLapRecord[driver.id][0].push(driver.lapDistance);
						this.driverLapRecord[driver.id][1].push(driver.currentTime);
						if (this.lapStartTime === -1) {
							this.lapStartTime = nowCheck - driver.currentTime;
						}
					}
				} else if (
					(
						this.playerSlotId !== -1 &&
						driver.id === this.playerSlotId
					) &&
					this.driverLapRecord[driver.id][2][0] !== -1
				) {
					this.driverLapRecord[driver.id] = [
						[0],
						[0],
						[-1]
					];
				}
			} else {
				this.driverLapRecord[driver.id] = [
					[0],
					[0],
					[-1]
				];
			}
		});
		if (needStoring) {
			localStorage.StoredRecordedLaps =
				JSON.stringify(this.storedRecordedLaps, null, '  ');
		}
	}

	private showKey = (e: KeyboardEvent) => {
		if (!this.lockHud) {
			if (e.key === 'ArrowRight' && e.shiftKey) {
				// showDebugMessage(`Key: ${e.key} | Code: ${e.code}`);
				if (this.currentLayout === 1) {
					this.toggleLayout2();
				} else if (this.currentLayout === 2) {
					this.toggleLayout3();
				} else if (this.currentLayout === 3) {
					this.toggleLayout1();
				}
			} else if (e.key === 'ArrowLeft' && e.shiftKey) {
				// showDebugMessage(`Key: ${e.key} | Code: ${e.code}`);
				if (this.currentLayout === 1) {
					this.toggleLayout3();
				} else if (this.currentLayout === 2) {
					this.toggleLayout1();
				} else if (this.currentLayout === 3) {
					this.toggleLayout2();
				}
			} else if (e.key === 'ArrowUp' && e.shiftKey) {
				// showDebugMessage(`Key: ${e.key} | Code: ${e.code}`);
				this.toggleHide();
			} else if (e.key === 'ArrowDown' && e.shiftKey) {
				// showDebugMessage(`Key: ${e.key} | Code: ${e.code}`);
				this.showAllWidgets();
			} else if (e.key === 'F1' && e.shiftKey) {
				// showDebugMessage(`Key: ${e.key} | Code: ${e.code}`);
				this.copyLayoutToClipboard();
			} else if (e.key === 'F5' && e.shiftKey) {
				// showDebugMessage(`Key: ${e.key} | Code: ${e.code}`);
				window.location.reload(true);
			}
		}
		if ((e.key === 'L' || e.key === 'l') && e.shiftKey && e.ctrlKey && e.altKey) {
			// showDebugMessage(`Key: ${e.key} | Code: ${e.code}`);
			this.toggleLockHud();
		/*} else {
			showDebugMessage(`Key: ${e.key} | Code: ${e.code}`);*/
		}
		if (!e.shiftKey) { this.shiftModifier = false; }
	};

	@action
	private parseRankingData = () => {
		// console.log('TRYING TO FETCH RANKING DATA');
		if (rankData.length <= 0) {
			getJason();
		}
		if (rankData.length <= 0) {
			this.parseRankingDataTimeout = setTimeout(this.parseRankingData, 5000);
		}
	}

	@action
	private checkMouseMove = () => {
		clearTimeout(this.mouseTimeout);
		if (
			Math.abs(
				this.nowMousemovement - this.lastMousemovement
			) < 100 ||
			this.lastMousemovement === this.nowMousemovement
		) {
			this.lastMousemovement = this.nowMousemovement;
			this.mouseOnTheMove = false;
			this.hideMouse = true;
			this.settingsOpacity = 0;
		}
		if (!this.hideMouse) {
			this.lastMousemovement = this.nowMousemovement;
			if (this.mouseTimeout) {
				clearTimeout(this.mouseTimeout);
			}
			this.mouseTimeout = setTimeout(this.checkMouseMove, 3000);
		}
	}

	private goStandardLogo() {
		this.hLogoUrl = './../../img/logo.png';
		eLogoUrl = this.hLogoUrl;
		if (this.currentLayout === 1) {
			localStorage.currentLogo = this.hLogoUrl;
		} else if (this.currentLayout === 2) {
			localStorage.currentLogo2 = this.hLogoUrl;
		} else if (this.currentLayout === 3) {
			localStorage.currentLogo3 = this.hLogoUrl;
		}
		this.saveSettings();
		// this.settings.tvTower.subSettings.hLogoUrl.enabled = false;
		// this.logoUrlEdit = false;
		return;
	}

	private shiftKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Shift') { this.shiftModifier = true; }
	};

	private shiftKeyUp = (e: KeyboardEvent) => {
		if (e.key === 'Shift') { this.shiftModifier = false; }
	};

	private onKeyPress = (e: KeyboardEvent) => {
		if (this.lockHud) { return; }
		if (
			currentFocusIsInput() &&
			e.key === 'Enter' &&
			this.logoUrlEdit
		) {
			this.enterPressed = true;
			return;
		}

		if (e.key === 'I' && e.shiftKey) {
			if (this.updateFunction) {
				unregisterUpdate(this.updateFunction);
				this.updateFunction = null;
				this.setData(true);
			} else {
				this.updateFunction = this.setData.bind(this);
				registerUpdate(this.updateFunction);
			}
		}
	};

	private getPositionRelative = (x: number, y: number) => {
		if (!this.appRef.current) {
			return {
				x: 0,
				y: 0
			};
		}
		const offset = this.appRef.current.getBoundingClientRect();
		return {
			x: (x - offset.left * this.appZoom) / this.appZoom,
			y: (y - offset.top * this.appZoom) / this.appZoom
		};
	};

	private copyLayoutToClipboard() {
		const json = JSON.stringify(this.settings, null, '  ');
		const copyFrom = document.createElement('textarea');
		copyFrom.value = json;
		copyFrom.style.opacity = '0';
		document.body.appendChild(copyFrom);
		copyFrom.select();
		document.execCommand('copy');
		document.body.removeChild(copyFrom);
		showDebugMessage(_('Saved Layout-Settings to Clipboard'), 3000);
	}

	@action
	private onMouseDown = (e: React.MouseEvent) => {
		const widgetId = this.getWidgetId(e);

		if (!widgetId) {
			return;
		}
		if (this.lockHud && e.button !== 2) {
			return;
		}
		if (e.button === 2) {
			if (widgetId && widgetId === 'fuelDetail') {
				this.elBlocko = false;
				blockFuelCalc = this.elBlocko;
			}
			return;
		}
		this.elBlocko = true;
		blockFuelCalc = this.elBlocko;

		if (this.lockHud) { return; }
		this.showEditGrid = true;

		const widgetEl = e.currentTarget as HTMLDivElement;
		const widgetOffset = widgetEl.getBoundingClientRect();

		const cursorPosition = this.getPositionRelative(e.clientX, e.clientY);

		// Need to scale these with zoom to get proper values
		const correctedOffset = this.getPositionRelative(
			widgetOffset.left * this.appZoom,
			widgetOffset.top * this.appZoom
		);

		this.currentCursorWidgetOffset = {
			id: widgetId,
			x: correctedOffset.x - cursorPosition.x,
			y: correctedOffset.y - cursorPosition.y
		};
	};

	@action
	private onMouseDowna = (e: React.MouseEvent) => {
		if (this.lockHud) { return; }
		const widgetId = this.getWidgetId(e);
		if (!widgetId) {
			return;
		}
		this.showEditGrid = true;

		const widgetEl = e.currentTarget as HTMLDivElement;
		const widgetOffset = widgetEl.getBoundingClientRect();

		const cursorPosition = this.getPositionRelative(e.clientX, e.clientY);

		// Need to scale these with zoom to get proper values
		const correctedOffset = this.getPositionRelative(
			widgetOffset.left * (this.appZoom / 2),
			widgetOffset.top * (this.appZoom / 2)
		);

		this.currentCursorWidgetOffset = {
			id: widgetId,
			x: correctedOffset.x - cursorPosition.x,
			y: correctedOffset.y - cursorPosition.y
		};
	};

	@action
	private onWheel = (e: React.WheelEvent) => {
		if (this.lockHud) { return; }
		const widgetId = this.getWidgetId(e);
		if (!widgetId) {
			return;
		}

		const diff = e.deltaY < 0
			?	this.shiftModifier
				?	0.2
				:	0.01
			:	this.shiftModifier
				?	-0.2
				:	-0.01;

		this.settings[widgetId].zoom = this.settings[widgetId].zoom + diff;

		this.settings[widgetId].zoom = Math.max(
			0.1,
			Math.min(3, this.settings[widgetId].zoom)
		);
		this.saveSettings();
	};

	@action
	private onMouseUp = () => {
		setTimeout(() => {
			this.elBlocko = false;
			blockFuelCalc = this.elBlocko;
		}, 1000);
		if (this.lockHud) { return; }
		this.currentCursorWidgetOffset = null;
		this.showEditGrid = false;
	};

	@action
	private timerSaveSettings = () => {
		this.saveSettings();
	};

	private saveSettings() {
		if (this.currentLayout === 1) {
			localStorage.appSettings = JSON.stringify(this.settings, null, '  ');
		} else if (this.currentLayout === 2) {
			localStorage.appSettings2 = JSON.stringify(this.settings, null, '  ');
		} else if (this.currentLayout === 3) {
			localStorage.appSettings3 = JSON.stringify(this.settings, null, '  ');
		}
	}

	@action
	private recoverSettings = () => {
		let savedSettings = {};
		if (this.currentLayout === 1) {
			if (localStorage.appSettings) {
				savedSettings = JSON.parse(localStorage.appSettings);
				let hasFaulty = false;
				Object.keys(savedSettings).forEach((key) => {
					if (!Object.prototype.hasOwnProperty.call(this.settings, key)) {
						hasFaulty = true;
					}
					Object.keys(savedSettings[key].subSettings).forEach((keya) => {
						if (this.settings[key] === undefined) {
							hasFaulty = true;
						} else if (!Object.prototype.hasOwnProperty.call(
							this.settings[key].subSettings, keya)
						) {
							hasFaulty = true;
						} else if (keya === 'showMPH') {
							this.mphSpeed = savedSettings[key].subSettings[keya].enabled;
							speedInMPH = this.mphSpeed;
						}
					});
				});
				if (hasFaulty) {
					this.resetSettings();
				} else {
					this.settings = merge(this.settings, savedSettings);
				}
			} else {
				this.resetSettings();
			}
			this.hLogoUrl = localStorage.currentLogo
				?	localStorage.currentLogo
				:	this.hLogoUrl = './../../img/logo.png';
			eLogoUrl = this.hLogoUrl;
		} else if (this.currentLayout === 2) {
			if (localStorage.appSettings2) {
				savedSettings = JSON.parse(localStorage.appSettings2);
				let hasFaulty = false;
				Object.keys(savedSettings).forEach((key) => {
					if (!Object.prototype.hasOwnProperty.call(this.settings, key)) {
						hasFaulty = true;
					}
					Object.keys(savedSettings[key].subSettings).forEach((keya) => {
						if (this.settings[key] === undefined) {
							hasFaulty = true;
						} else if (!Object.prototype.hasOwnProperty.call(
							this.settings[key].subSettings, keya)
						) {
							hasFaulty = true;
						} else if (keya === 'showMPH') {
							this.mphSpeed = savedSettings[key].subSettings[keya].enabled;
							speedInMPH = this.mphSpeed;
						}
					});
				});
				if (hasFaulty) {
					this.resetSettings();
				} else {
					this.settings = merge(this.settings, savedSettings);
				}
			} else {
				this.resetSettings();
			}
			this.hLogoUrl = localStorage.currentLogo2
				?	localStorage.currentLogo2
				:	this.hLogoUrl = './../../img/logo.png';
			eLogoUrl = this.hLogoUrl;
		} else if (this.currentLayout === 3) {
			if (localStorage.appSettings3) {
				savedSettings = JSON.parse(localStorage.appSettings3);
				let hasFaulty = false;
				Object.keys(savedSettings).forEach((key) => {
					if (!Object.prototype.hasOwnProperty.call(this.settings, key)) {
						hasFaulty = true;
					}
					Object.keys(savedSettings[key].subSettings).forEach((keya) => {
						if (this.settings[key] === undefined) {
							hasFaulty = true;
						} else if (!Object.prototype.hasOwnProperty.call(
							this.settings[key].subSettings, keya)
						) {
							hasFaulty = true;
						} else if (keya === 'showMPH') {
							this.mphSpeed = savedSettings[key].subSettings[keya].enabled;
							speedInMPH = this.mphSpeed;
						}
					});
				});
				if (hasFaulty) {
					this.resetSettings();
				} else {
					this.settings = merge(this.settings, savedSettings);
				}
			} else {
				this.resetSettings();
			}
			this.hLogoUrl = localStorage.currentLogo3
				?	localStorage.currentLogo3
				:	this.hLogoUrl = './../../img/logo.png';
			eLogoUrl = this.hLogoUrl;
		}
	};

	@action
	private setData = (clear = false) => {
		this.debugData = !clear ? r3e.data : null;
	};

	@action
	private changeLogoUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = (e.target as HTMLInputElement).value;
		this.hLogoUrl = value === 'none' || value === ''
			?	'./../../img/logo.png'
			:	value;
		eLogoUrl = this.hLogoUrl;
		if (this.currentLayout === 1) {
			localStorage.currentLogo = this.hLogoUrl;
		} else if (this.currentLayout === 2) {
			localStorage.currentLogo2 = this.hLogoUrl;
		} else if (this.currentLayout === 3) {
			localStorage.currentLogo3 = this.hLogoUrl;
		}
		if (this.enterPressed) {
			this.settings.tvTower.subSettings.hLogoUrl.enabled = false;
			this.logoUrlEdit = false;
			this.enterPressed = false;
		}
		this.saveSettings();
	}

	@action
	private emptyUrl = () => {
		this.hLogoUrl = '';
		this.logoUrlEdit = true;
	}

	@action
	private onMouseMove = (e: MouseEvent) => {
		if (this.lockHud) { return; }
		// showDebugMessage(`${this.hLogoUrl}`);

		// const x1 = e.clientX;
		// const x2 = 0;
		this.nowMousemovement = e.clientX + e.clientY;

		if (
			Math.abs(
				this.lastMousemovement - this.nowMousemovement
			) > 100 ||
			this.mouseOnTheMove
		) {
			this.lastMousemovement = this.nowMousemovement;
			this.hideMouse = false;
			if (this.mouseTimeout) {
				clearTimeout(this.mouseTimeout);
			}
			this.mouseTimeout = setTimeout(this.checkMouseMove, 3000);
		}

		/* const diff = Math.max(0, 1 - Math.pow(Math.max(0, (x1 - x2)) / 100, 7));
		this.settingsOpacity = 1;// diff;
		if (this.settingsOpacity === 0) {
			clearTimeout(this.mouseTimeout);
			this.hideMouse = false;
		} */

		this.settingsOpacity = 1; // diff;

		const cursorOffset = this.currentCursorWidgetOffset;
		if (!cursorOffset || !cursorOffset.id) {
			return;
		}

		const widgetId = cursorOffset.id;
		const widgetSettings = this.settings[widgetId];

		const cursorPosition = this.getPositionRelative(e.clientX, e.clientY);

		// Apply offset so widgets don't move relative to cursor start
		widgetSettings.position.x = cursorPosition.x + cursorOffset.x;
		widgetSettings.position.y = cursorPosition.y + cursorOffset.y;

		// Snap to 10px grid
		widgetSettings.position.x -= this.snapOn
			?	widgetSettings.position.x % 10
			:	widgetSettings.position.x % 1;
		widgetSettings.position.y -= this.snapOn
			?	widgetSettings.position.y % 10
			:	widgetSettings.position.y % 1;

		this.saveSettings();
	};

	@action
	private toggleWidget = (e: ChangeEvent<HTMLInputElement>) => {
		const name = e.target.getAttribute('data-name');
		if (!name) {
			return;
		}
		this.settings[name].enabled = !this.settings[name].enabled;
		this.saveSettings();
	};

	@action
	private zoomWidget = (e: ChangeEvent<HTMLInputElement>) => {
		const name = e.target.getAttribute('data-name');
		if (!name) {
			return;
		}
		this.settings[name].zoom = parseFloat(e.target.value);

		this.saveSettings();
	};

	@action
	private resetWidget(e: React.MouseEvent) {
		const name = e.currentTarget.getAttribute('data-name');
		if (!name) {
			eResetId = '';
			return;
		}
		eResetId = name;
		return;
	}

	@action
	private toggleSubWidget = (e: ChangeEvent) => {
		this.hLogoUrl = this.hLogoUrl === 'none' || this.hLogoUrl === ''
			?	'./../../img/logo.png'
			:	this.hLogoUrl;
		eLogoUrl = this.hLogoUrl;
		this.logoUrlEdit = false;
		const name = e.target.getAttribute('data-name');
		const subName = e.target.getAttribute('data-sub-name');
		if (!name || !subName) {
			return;
		}
		const subSettings = this.settings[name].subSettings;
		if (!subSettings) {
			return;
		}

		subSettings[subName].enabled = !subSettings[subName].enabled;

		if (subName === 'clearComboData' || subName === 'clearAllData') {
			setTimeout(
				() => {
					subSettings[subName].enabled = false;
				}
				, 100
			);
			this.showSettings = !this.showSettings;
			return;
		}
		if (subName === 'showMPH') {
			this.mphSpeed = subSettings[subName].enabled;
			speedInMPH = this.mphSpeed;
		}
		this.saveSettings();
	};

	@action
	private showAllWidgets = () => {
		this.showAll = !this.showAll;
		showAllMode = this.showAll;
		localStorage.showAllMode = showAllMode
			? '1' : '0';
		if (showAllMode) {
			this.hide = false;
			hideWidgets = this.hide;
			localStorage.hideWidgets = '0';
		}
		this.saveSettings();
		window.location.reload(true);
	};

	@action
	private toggleChangeLog = () => {
		this.changeLogToggled = true;
		window.location.reload(true);
	};

	@action
	private togglePerformanceModeLow = () => {
		this.lowPerfo = true;
		this.highPerfo = false;
		lowPerformanceMode = this.lowPerfo;
		highPerformanceMode = this.highPerfo;
		localStorage.lowPerformanceMode = lowPerformanceMode
			? '1' : '0';
		localStorage.highPerformanceMode = highPerformanceMode
			? '1' : '0';
		this.saveSettings();
	};

	@action
	private togglePerformanceModeNormal = () => {
		this.lowPerfo = false;
		this.highPerfo = false;
		lowPerformanceMode = this.lowPerfo;
		highPerformanceMode = this.highPerfo;
		localStorage.lowPerformanceMode = lowPerformanceMode
			? '1' : '0';
		localStorage.highPerformanceMode = highPerformanceMode
			? '1' : '0';
		this.saveSettings();
	};

	@action
	private togglePerformanceModeHigh = () => {
		this.lowPerfo = false;
		this.highPerfo = true;
		lowPerformanceMode = this.lowPerfo;
		highPerformanceMode = this.highPerfo;
		localStorage.lowPerformanceMode = lowPerformanceMode
			? '1' : '0';
		localStorage.highPerformanceMode = highPerformanceMode
			? '1' : '0';
		this.saveSettings();
	};

	@action
	private toggleSnap = () => {
		this.snapOn = !this.snapOn;
		localStorage.snapOn = this.snapOn
			? '1' : '0';
		this.saveSettings();
	};

	@action
	private toggleLayout1 = () => {
		this.currentLayout = 1;
		localStorage.currentLayout = '1';
		showDebugMessage(_('Restored Layout 1'), 1000);
		this.recoverSettings();
		this.settings.tvTower.subSettings.hLogoUrl.enabled = false;
	};

	@action
	private toggleLayout2 = () => {
		this.currentLayout = 2;
		localStorage.currentLayout = '2';
		showDebugMessage(_('Restored Layout 2'), 1000);
		this.recoverSettings();
		this.settings.tvTower.subSettings.hLogoUrl.enabled = false;
	};

	@action
	private toggleLayout3 = () => {
		this.currentLayout = 3;
		localStorage.currentLayout = '3';
		showDebugMessage(_('Restored Layout 3'), 1000);
		this.recoverSettings();
		this.settings.tvTower.subSettings.hLogoUrl.enabled = false;
	};

	@action
	private toggleRankInvert = () => {
		this.rankInvert = !this.rankInvert;
		eRankInvert = this.rankInvert;
		localStorage.rankInvert = this.rankInvert ? '1' : '0';
		this.saveSettings();
	}

	@action
	private toggleRankInvertRelative = () => {
		this.rankInvertRelative = !this.rankInvertRelative;
		eRankInvertRelative = this.rankInvertRelative;
		localStorage.rankInvertRelative = this.rankInvertRelative ? '1' : '0';
		this.saveSettings();
	}

	@action
	private driverNumTo1 = () => {
		this.driverNum = 1;
		eDriverNum = this.driverNum;
		localStorage.driverNum = '1';
		this.saveSettings();
	}

	@action
	private driverNumTo2 = () => {
		this.driverNum = 2;
		eDriverNum = this.driverNum;
		localStorage.driverNum = '2';
		this.saveSettings();
	}

	@action
	private driverNumTo3 = () => {
		this.driverNum = 3;
		eDriverNum = this.driverNum;
		localStorage.driverNum = '3';
		this.saveSettings();
	}

	@action
	private changeBeepVolume = (e: ChangeEvent<HTMLInputElement>) => {
		this.settings.spotting.volume = parseFloat(e.target.value);

		this.saveSettings();
	};

	@action
	private changeResetText = () => {
		if (this.resetString === `${_('Reset Settings')}`) {
			clearInterval(this.resetInterval);
			this.resetString = `!!! ${_('Click again to confirm Layout reset')} !!!`;
			this.resetInterval = setInterval(this.clearResetInterval, 5000);
		} else {
			clearInterval(this.resetInterval);
			this.resetString = _('Layout reseted!');
			this.resetInterval = setInterval(this.clearResetInterval, 5000);
			this.resetSettings();
		}
	}

	@action
	private clearResetInterval = () => {
		clearInterval(this.resetInterval);
		this.resetString = _('Reset Settings');
	}

	@action
	private resetSettings = () => {
		Object.keys(this.settings).forEach((key) => {
			const setting = this.settings[key];
			const defaultSettings = this.defaultsettings[key];
			setting.position.x = defaultSettings.position.x;
			setting.position.y = defaultSettings.position.y;
			setting.volume = defaultSettings.volume;
			setting.zoom = defaultSettings.zoom;
			setting.enabled = defaultSettings.enabled;
			Object.keys(setting.subSettings).forEach((keya) => {
				const subSetting = setting.subSettings[keya];
				const defaultSubSetting = defaultSettings.subSettings[keya];
				subSetting.enabled = defaultSubSetting.enabled;
			});
		});
		if (this.currentLayout === 1) {
			delete localStorage.appSettings;
			this.hLogoUrl = './../../img/logo.png';
			eLogoUrl = this.hLogoUrl;
			delete localStorage.currentLogo;
		} else if (this.currentLayout === 2) {
			delete localStorage.appSettings2;
			this.hLogoUrl = './../../img/logo.png';
			eLogoUrl = this.hLogoUrl;
			delete localStorage.currentLogo2;
		} else if (this.currentLayout === 3) {
			delete localStorage.appSettings3;
			this.hLogoUrl = './../../img/logo.png';
			eLogoUrl = this.hLogoUrl;
			delete localStorage.currentLogo3;
		}
		this.saveSettings();
	};

	@action
	private handleResize = () => {
		const widthRatio = window.innerWidth / 1920;
		const heightRatio = window.innerHeight / 1080;
		const ratio = Math.min(widthRatio, heightRatio);
		this.appZoom = ratio;
	};

	@action
	private updateDebugFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
		this.debugFilter = e.target.value;
	};

	@action
	private clearDebugFilter = () => {
		this.debugFilter = '';
	};

	@action
	private toggleSettings = () => {
		this.showSettings = !this.showSettings;
		this.settings.tvTower.subSettings.hLogoUrl.enabled = false;
	};

	@action
	private toggleRanking = () => {
		this.tempHide = !this.showRanking ? true : false;
		this.showRanking = !this.showRanking;
	};

	@action
	private toggleHide = () => {
		this.hide = !this.hide;
		hideWidgets = this.hide;
		localStorage.hideWidgets = hideWidgets
			? '1' : '0';
		this.saveSettings();
	};

	@action
	private openDownload = () => {
		window.open('https://otterhud.github.io/dash.zip', '_blank');
	}

	@action
	private toggleLockHud = () => {
		this.lockHud = !this.lockHud;
		localStorage.lockHudStatus = this.lockHud ? '1' : '0';
		this.saveSettings();
		if (this.lockHud) {
			showDebugMessage(`!!! ${_('UI IS NOW LOCKED - UNLOCK WITH CTRL+ALT+SHIFT+L !!!\n\t\t\t\tNO FURTHER MESSAGES')}`, 5000);
		} else {
			showDebugMessage(`!!! ${_('UI IS NOW UNLOCKED')} !!!`, 5000);
		}
	};

	@action
	private setLocale = (lang: Locales) => {
		setLocale(lang);
		this.language = lang;
		localStorage.language = lang;
		clearInterval(this.resetInterval);
		this.resetInterval = setInterval(this.clearResetInterval, 10);
	};

	private getWidgetId(e: React.MouseEvent | React.WheelEvent) {
		return (e.currentTarget as HTMLDivElement).getAttribute('data-id');
	}
	private getClassName(e: React.MouseEvent | React.WheelEvent) {
		return (e.currentTarget as HTMLDivElement).className;
	}

	render() {
		const driverDataPlace =
			r3e.data
			?	r3e.data.DriverData
				?	r3e.data.DriverData[0]
					?	r3e.data.DriverData[0].Place
					:	-1
				:	-1
			:	-1;
		if (localStorage.gameInMenus && !isMenu) {
			isMenu = true;
			window.location.reload(true);
		}
		if (!this.gameInMenus) { isMenu = false; }
		const showAtAll =
			r3e.data && !this.gameInMenus /* && (!this.gameInReplay || this.sessionType === ESession.Race) */&& r3e.data.DriverData.length > 0;
		const versionMisMatch = r3e.data !== undefined &&
			(
				// r3e.data.VersionMinor !== process.env.SHARED_MEMORY_VERSION_MINOR ||
				r3e.data.VersionMajor !== process.env.SHARED_MEMORY_VERSION_MAJOR
			);
		const showNoData = noData;
		if (
			(
				r3e.data === undefined || versionMisMatch
			) && eIsIngameBrowser
		) {
			setTimeout(() => {
				this.forceUpdate();
			}, 100);

			if (nowCheck - this.loadTime < 2000) {
				return null;
			}
			return (
				<div className="help">
					{versionMisMatch && (
						<div className="versionMismatch">
							{_('Version mismatch')}!
						</div>
					)}
					{_('OtterHud Start-Parameter set correctly')}
						<div className="fillor">
							{`${'INVISIBLE_FILLER'}`}
						</div>
						<div className="noData">
							{_('NO Data-Feed detected')}
						</div>
					<br />
					{_('You need to download/run dash.exe')}
					<br />
					{_('Visit the Forum-Thread to Download')}
					<br />
					<br />
					{_('Or enable this option in Crew-Chief:')}
						<div className="ccOption">
							{_('Enable WebHud integration')}
						</div>
				</div>
			);
		}

		if (r3e.data !== undefined && this.tractionControlPercentUndefined) {
			setTimeout(() => {
				this.forceUpdate();
			}, 100);

			if (nowCheck - this.loadTime < 2000) {
				return null;
			}
			return (
				<div className="help">
					{_('OtterHud Start-Parameter set correctly')}
						<div className="fillor">
							{`${'INVISIBLE_FILLER'}`}
						</div>
						<div
							className="noData"
							style={{
							}}
						>
							{_('Your dash.exe is OUTDATED')}
						</div>
					<br />
					{_('You need to re-download dash.exe')}
					<br />
					{_('Visit the Forum-Thread to Download')}
				</div>
			);
		}

		if (
			(
				!eIsIngameBrowser &&
				(
					!showAtAll ||
					showNoData
				)
			) ||
			(
				this.gameInReplay &&
				(
					driverDataPlace === -1 ||
					this.sessionType !== 2
				) &&
				this.playerDriverDataIndex === -1
			)
		) {
			setTimeout(() => {
				this.forceUpdate();
			}, 1000);
			if (nowCheck - this.loadTime > 2000) {
				return (
					<div>
						{`${''}`}
					</div>
				);
			}
			return null;
		}

		if (!this.changeLogRead) {
			return (
				<div
					className="viewport"
					style={{
						zoom: this.appZoom
					}}
				>
					<div className="changelog">
						<div className="otterLogo">
							<img
								className="oh_logo"
								src={
									require('./../../img/otterhud_logo.png')
								}
							/>
						</div>
						<div className="otterTitle">
							{`${' Welcome to OtterHud '}`}
						</div>
						<div className="otterVersion">
							{`Version: ${currentVersion}`}
						</div>
						<div className="line"/>
						<div className="forumTitle">
							{`${'Questions? Suggestions? Bugs?\nVisit the Forum'}`}
						</div>
						<img
							className="forumQRImg"
							src={
								require('./../../img/qr_forum.png')
							}
						/>
						<div className="line2"/>
						<div className="coffeePot">
							<img
								className="coffeePotImg"
								src={
									require('./../../img/coffee.gif')
								}
							/>
						</div>
						<img
							className="paypalQRImg"
							src={
								require('./../../img/qr.png')
							}
						/>
						<div className="payPal_1">
							{`${'Otter'}'s Coffe-Fund`}
						</div>
						<div className="payPal_2">
							{`${'paypal.me/otternas3'}`}
						</div>
						<div className="changeLogTitle">
							{`${'CHANGELOG'}`}
						</div>
						<div className="theLog">
							<b>
								<span
									style={{
										textDecoration: 'underline',
										fontSize: '26px'
									}}
								>
									{`${'GENERAL'}`}
								</span>
							</b>
							<br />
							<ul>
								<li>{`${'dash.exe got a Auto-Updater function now, the next time you Download, this feature will be included.'}`}<br />
									{`${'It will check once on start for a new version.'}`}<br />
								</li><br />
								<li>{`${'Added - Italian Language'}`}<br />
									{`${'Thanks to @SamuTNT'}`}<br />
								</li><br />
								<li>{`${'Added - Polish Language'}`}<br />
									{`${'Thanks to @oran'}`}<br />
								</li><br />
								<li>{`${'Added - Track Data for Valerbanen & Brno'}`}<br />
									{`${'This includes Relative timings, and Track Details (Track Name, Layout Name, Length, Corner Names)'}`}<br />
								</li><br />
								<li>{`${'Added - Show Ranking Site Button'}`}<br />
									{`${'This will open your Ranking Statistics Site within the OtterHud'}`}<br />
									{`${'This should help Drivers with only a Single Monitor, so they dont need to alt-Tab all the time.'}`}<br />
								</li><br />
								<li>{`${'Changed - Motec option "Speed in MPH" will now change the displayed Speed for the PitLimiter and Fuel & Lap Details Widgets also'}`}<br />
								</li>
								<br />
								<br />
							</ul>
							<b>
								<span
									style={{
										textDecoration: 'underline',
										fontSize: '26px'
									}}
								>
									{`${'Widgets'}`}
								</span>
							</b>
							<br />
							<br />
							<br />
							<b>
								<span
									style={{
										fontSize: '22px'
									}}
								>
									{`${'Race Info'}`}
								</span>
							</b>
							<br />
							<ul>
								<li>{`${'Fixed - Showing "This lap will not count" on Hillclimb'}`}<br />
								</li><br />
								<li>{`${'Added - Pit-Entrance distance'}`}<br />
									{`${'Once you requested a Pit-Stop, and your Distance to Pit-Entrance is lower then 500m, it will show the Distance additional to the "Pit-Stop requested" message'}`}<br />
								</li>
								<br />
								<br />
							</ul>
							<b>
								<span
									style={{
										fontSize: '22px'
									}}
								>
									{`${'Pit limiter'}`}
								</span>
							</b>
							<ul>
								<li>{`${'Changed - Pit limiter will now be shown 250m '}`}<b><u>{`${'before'}`}</u></b>{`${' the Pit-Entrance, '}`}<b><u>{`${'if Pit-Stop is requested!'}`}</u></b><br />
									{`${'This should help people to slow down to the allowed Speed in Pit-Lane '}`}<b><u>{`${'before'}`}</u></b>{`${' they enter the Pits'}`}<br />
								</li><br />
								<li>{`${'Added - Pit-Entrance Distance'}`}<br />
									{`${'If a Pit-Stop is requested, the Pit limiter will now, additionally, show the distance to the Pit-Entrance'}`}<br />
								</li><br />
								<li>{`${'Added - Pit-Spot Distance'}`}<br />
									{`${'Once you enter the Pit-Lane the distance to your assigned Pit-Spot will be shown'}`}<br />
									{`${'(Gathering required data for this took almost 2 Days O.o)'}`}<br />
								</li>
								<br />
								<br />
							</ul>
							<b>
								<span
									style={{
										fontSize: '22px'
									}}
								>
									{`${'Relative'}`}
								</span>
							</b>
							<ul>
								<li>{`${'Fixed(ish) - Jumping order of Drivers'}`}<br />
									{`${'Due to some recent changes to the API, specific to the way the LapDistance is reported to the API in Multiplayer, the Relative had some trouble with sorting the List for Drivers ahead/behind'}`}<br />
									{`${'Underlying problem here is, in MultiPlayer the Track is now cut into some kind of LapDistance-Boxes'}`}<br />
									{`${'So 2 Drivers could be in the same Box and will report back to the API the same LapDistance.'}`}<br />
									{`${'This made the relative flip out, so Cars clearly ahead showed up behind in the relative and started jumping back and forth, same for Cars clearly behind.'}`}<br />
									{`${'I implemented a Workaround, that will stop the jumping for the Car directly ahead/behind the Driver.'}`}<br />
									<b>{`${'BUT'}`}</b>{`${', it is kinda costly on Performance to implement that Workaround for the whole Field!'}`}<br />
									{`${'Any Feedback on the behaviour with this fix would be highly appreciated!'}`}<br />
								</li>
								<br />
								<br />
							</ul>
								<b>{`${'--------------------------------------------------- CHANGELOG END ---------------------------------------------------'}`}</b><br />
								<br />
								{`${'You can see the FULL-CHANGELOG from v1.0 in the Forums!'}`}<br />
								<br />
								<br />
								{`${'As always if you encounter any sort of problems, have questions or a suggestion,'}`}<br />
								{`${'feel free to post in the Forum-Thread!'}`}<br />
								<br />
								{`${'The OtterHud will remain free to use!'}`}<br />
								{`${'But if you really Enjoying it, and you can effort it, consider donating to my Coffee-Fund'}`}<br />
								{`${'Coffee is literally the only thing keeps me going, which will keep the updates going ;)'}`}<br />
								<br />
								<br />
								<br />
								{`${'Moo,'}`}<br />
								{`${'Otter'}`}
						</div>
						<div
							className="gotIt"
							onClick={this.toggleChangeLog}
							style={{
								lineHeight: localStorage.language === 'de'
								?	'52px'
								:	'42px',
								fontSize: localStorage.language === 'de'
								?	'40px'
								:	'42px'
							}}
						>
							{_('PRESS CLUTCH / BRAKE / THROTTLE - OR CLICK HERE - TO CLOSE')}
						</div>
					</div>
				</div>
			);
		}

		return (
			(
				showNoData && null
			) ||
			(
			<div
				className="viewport"
				style={{
					zoom: this.appZoom
				}}
			>
				<main
					ref={this.appRef}
					className={classNames(style.app, {
						hide: this.hide || this.tempHide
					})}
				>
					{
						(
							!eIsIngameBrowser && this.lastCheck === nowCheck &&
							(
								<div className="invisPlaceholder">
									{`${' '}`}
								</div>
							)
						)
					}
					{this.getWidgets()}

					{this.showSettings && this.getAppSettings()}

					{this.showRanking && this.getRanking()}

					<div
						style={{
							opacity: this.hideMouse ? 0 : this.settingsOpacity
						}}
						className={classNames('toggleSettings', {
							hideIcon: this.hideMouse || this.lockHud
						})}
						onClick={this.toggleSettings}
					>
						<SvgIcon src={require('./../../img/icons/cog.svg')} />
					</div>
					<div
						style={{
							opacity: this.hideMouse ? 0 : this.settingsOpacity
						}}
						className={classNames('toggleVisibility', {
							hideIcon: this.hideMouse || this.lockHud
						})}
						onClick={this.toggleHide}
					>
						<SvgIcon src={require('./../../img/icons/eye.svg')} />
					</div>
					<div
						style={{
							opacity: this.hideMouse ? 0 : this.settingsOpacity
						}}
						className={classNames('toggleRanking', {
							hideIcon: this.hideMouse || this.lockHud
						})}
						onClick={this.toggleRanking}
					>
						<SvgIcon src={require('./../../img/icons/ranking.svg')} />
					</div>
					<div
						style={{
							opacity: this.hideMouse ? 0 : this.settingsOpacity
						}}
						className={classNames('toggleLayout1', {
							hideIcon: this.hideMouse || this.lockHud,
							active: this.currentLayout === 1
						})}
						onClick={this.toggleLayout1}
					>
						{`${'L1'}`}
					</div>
					<div
						style={{
							opacity: this.hideMouse ? 0 : this.settingsOpacity
						}}
						className={classNames('toggleLayout2', {
							hideIcon: this.hideMouse || this.lockHud,
							active: this.currentLayout === 2
						})}
						onClick={this.toggleLayout2}
					>
						{`${'L2'}`}
					</div>
					<div
						style={{
							opacity: this.hideMouse ? 0 : this.settingsOpacity
						}}
						className={classNames('toggleLayout3', {
							hideIcon: this.hideMouse || this.lockHud,
							active: this.currentLayout === 3
						})}
						onClick={this.toggleLayout3}
					>
						{`${'L3'}`}
					</div>
					{
						(
							this.lockHud && (
								<div
									style={{
										opacity: this.hideMouse ? 0 : this.settingsOpacity
									}}
									className={classNames('lockHud', {
										hideIcon: this.hideMouse || this.lockHud,
										active: this.lockHud
									})}
									onClick={this.toggleLockHud}
								>
									<SvgIcon
										src={require('./../../img/icons/locked.svg')}
									/>
								</div>
							)
						) ||
						(
							!this.lockHud && (
								<div
									style={{
										opacity: this.hideMouse ? 0 : this.settingsOpacity
									}}
									className={classNames('lockHud', {
										hideIcon: this.hideMouse || this.lockHud,
										active: this.lockHud
									})}
									onClick={this.toggleLockHud}
								>
									<SvgIcon
										src={require('./../../img/icons/unlocked.svg')}
									/>
								</div>
							)
						)
					}
				</main>
				{this.debugData && this.getDebug()}
				{this.showEditGrid && <div className="editGrid" />}
			</div>
			)
		);
	}

	private getDebug() {
		return (
			<div
				className={classNames('debug', {
					hide: this.hide || this.tempHide
				})}
			>
				<input
					value={this.debugFilter}
					onChange={this.updateDebugFilter}
					// tslint:disable-next-line:max-line-length
					placeholder={_('Type to filter keys')}
				/>
				<div className="clear" onClick={this.clearDebugFilter}>
					{`${'X'}`}
				</div>
				<pre className="debugInfo">
					{prettyDebugInfo(this.debugData!, this.debugFilter)}
				</pre>
			</div>
		);
	}

	private getWidgets() {
		return (
			<div className="widgets">
				{this.playerIsFocus && !this.gameInReplay && this.settings.gforce.enabled && (
					<Gforce
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.gforce}
					/>
				)}
				{this.settings.positionBar.enabled && (
					<PositionBar
						settings={this.settings.positionBar}
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						relative={false}
					/>
				)}
				{this.settings.positionBarRelative.enabled && (
					<PositionBar
						settings={this.settings.positionBarRelative}
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						relative={true}
					/>
				)}
				{this.settings.motec.enabled && (
					<Motec
						settings={this.settings.motec}
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
					/>
				)}
				{this.playerIsFocus && !this.gameInReplay && this.settings.progress.enabled && (
					<Progress
						settings={this.settings.progress}
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
					/>
				)}
				{this.settings.spotting.enabled && (
					<Spotting
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.spotting}
					/>
				)}
				{this.playerIsFocus && !this.gameInReplay && this.settings.aids.enabled && (
					<Aids
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.aids}
					/>
				)}
				{this.playerIsFocus && !this.gameInReplay && this.settings.crewChief.enabled && (
					<CrewChief
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.crewChief}
					/>
				)}
				{this.settings.overtakingAids.enabled && (
					<OvertakingAids
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.overtakingAids}
					/>
				)}
				{this.playerIsFocus && !this.gameInReplay && this.settings.damage.enabled && (
					<Damage
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.damage}
					/>
				)}
				{this.playerIsFocus && !this.gameInReplay && this.settings.tires.enabled && (
					<Tires
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.tires}
					/>
				)}
				{this.settings.inputs.enabled && (
					<Inputs
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.inputs}
					/>
				)}
				{this.playerIsFocus && !this.gameInReplay && this.settings.fuel.enabled && (
					<Fuel
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.fuel}
					/>
				)}
				{this.playerIsFocus && !this.gameInReplay && this.settings.fuelDetail.enabled && (
					<FuelDetail
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.fuelDetail}
					/>
				)}
				{this.settings.clock.enabled && (
					<Clock
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.clock}
					/>
				)}
				{this.settings.cornerNames.enabled && (
					<CornerNames
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.cornerNames}
					/>
				)}
				{this.settings.tvTower.enabled && (
					<TvTower
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.tvTower}
					/>
				)}
				{this.playerIsFocus && !this.gameInReplay && this.settings.info.enabled && (
					<Info
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.info}
					/>
				)}
				{this.playerIsFocus && !this.gameInReplay && this.settings.pitstop.enabled && (
					<Pitstop
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.pitstop}
					/>
				)}
				{this.settings.startingLights.enabled && (
					<StartingLights
						onMouseDown={this.onMouseDowna}
						onWheel={this.onWheel}
						settings={this.settings.startingLights}
					/>
				)}
				{this.settings.pitLimiter.enabled && (
					<PitLimiter
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.pitLimiter}
					/>
				)}
				{this.settings.flags.enabled && (
					<Flags
						onMouseDown={this.onMouseDown}
						onWheel={this.onWheel}
						settings={this.settings.flags}
					/>
				)}
				{this.settings.graphs.enabled && (
					<Graphs
						opacity={this.settingsOpacity}
					/>
				)}
			</div>
		);
	}

	private getRanking() {
		return (
			<div
				className="rankingSite"
				style={{
					position: 'absolute',
					width: '1920px',
					height: '1080px',
					zoom: '1',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					cursor: 'auto'
				}}
			>
				<iframe
					className="rankingSiteFrame"
					src={this.rankingUrl}
					style={{
						width: '1920px',
						height: '1080px',
						cursor: 'auto'
					}}
				/>
				<button
					className="closeRanking"
					onClick={this.toggleRanking}
					style={{
						position: 'absolute',
						width: '1920px',
						height: '185px',
						color: 'white',
						background: 'rgba(0, 0, 0, 1)',
						top: '0px',
						left: '0px',
						fontSize: '60px',
						fontWeight: 'bold',
						textTransform: 'uppercase'
					}}
				>
					{_('Close')}
				</button>
			</div>
		);
	}
	private getAppSettings() {
		return (
			<div className="settings">
				<div
					className="versionNumber"
					style={{
						padding: '0px',
						textAlign: 'left'
					}}
				>
					{_('Current version:')}{' '}{
						currentVersion
					}
				</div>
				<button
					className={classNames('buttonSnap', {
						active: this.snapOn
					})}
					onClick={this.toggleSnap}
				>
					{
						this.snapOn
						?	_('Widgets Grid-Snap Enabled')
						:	_('Widgets Grid-Snap Disabled')
					}
				</button>
				<button
					className="toggleChangeLog"
					onClick={this.toggleChangeLog}
				>
					{_('Show Changelog / Help')}
				</button>

				<div className="otterhud_logo">
					<img
						className="oh_logo"
						src={
							require('./../../img/otterhud_logo.png')
						}
					/>
				</div>
				<div
					className="performance"
					style={{
						color: (
							(
								(
									this.tempLowPerfo ||
									this.lowPerfo
								) && this.performance < 10
							) || (
								!this.tempLowPerfo &&
								(
									this.highPerfo ||
									this.tempHighPerfo
								) &&
								this.performance < 50
							) ||
							(
								!this.tempLowPerfo &&
								!this.tempHighPerfo &&
								!this.lowPerfo &&
								!this.highPerfo &&
								this.performance < 25
							)
						)
						?	'red'
						:	'lime',
						padding: currentVersion < 1.16
							?	'15px'
							:	'0px'
					}}
				>
					{_('Updates/sec:')}{' '}{
						this.lowPerfo || this.tempLowPerfo
							?	this.performance > 15
								?	15
								:	this.performance
							:	this.tempHighPerfo || this.highPerfo
								?	this.performance > 60
									?	60
									:	this.performance
								:	this.performance > 30
									?	30
									:	this.performance
					}
				</div>

				{Object.keys(this.settings).map((widgetId) => {
					const subSettings = this.settings[widgetId].subSettings;
					if (widgetId !== 'manualStart') {
						return this.getWidgetSetting(widgetId, subSettings);
					}
					return null;
				})}

				<div className="languages">
					{Object.keys(getTranslations()).map((langKey) => {
						const languageLookup = {
							de: _('German'),
							en: _('English'),
							fr: _('French'),
							pt: _('Portuguese'),
							es: _('Spanish'),
							it: _('Italian'),
							pl: _('Polish')
						};
						return (
							<div
								key={langKey}
								className={classNames('language', {
									active: langKey === this.language
								})}
								onClick={() => {
									this.setLocale(langKey as Locales);
								}}
							>
								{languageLookup[langKey]}
							</div>
						);
					})}
				</div>
				<button
					className={classNames('buttona', {
						active: this.showAll
					})}
					onClick={this.showAllWidgets}
				>
					{_('Widgets-TEST-Mode')}
				</button>
				<button
					className={classNames('buttonb', {
						active: this.lowPerfo
					})}
					onClick={this.togglePerformanceModeLow}
				>
					{_('Low Performance Mode')}
				</button>
				<button
					className={classNames('buttonc', {
						active: !this.lowPerfo && !this.highPerfo
					})}
					onClick={this.togglePerformanceModeNormal}
				>
					{_('Normal Performance Mode')}
				</button>
				<button
					className={classNames('buttond', {
						active: this.highPerfo
					})}
					onClick={this.togglePerformanceModeHigh}
				>
					{_('High Performance Mode')}
				</button>
				<button className="button_reset" onClick={this.changeResetText}>
					{_(this.resetString)}
				</button>
				<button className="button_close" onClick={this.toggleSettings}>
					{_('Close')}
				</button>
			</div>
		);
	}

	private getWidgetSetting(widgetId: string, subSettings: ISubSettings) {
		return (
			<div
				key={widgetId}
				className={classNames('widget', {
					active: this.settings[widgetId].enabled
				})}
			>
				<label
					className={classNames('main', {
						active: this.settings[widgetId].enabled
					})}
				>
					<span className="text">
						{this.settings[widgetId].name()}
					</span>
					<input
						type="checkbox"
						checked={this.settings[widgetId].enabled}
						data-name={widgetId}
						onChange={this.toggleWidget}
					/>
				</label>
				<button
					className="resetWidgetButton"
					data-name={widgetId}
					onClick={this.resetWidget}
				>
					{_('Reset')}
				</button>
				{
					widgetId === 'spotting' &&
					subSettings &&
					Object.keys(subSettings).map((subId) => {
						if (
							subId === 'shouldBeep' &&
							this.settings.spotting.enabled &&
							this.settings.spotting.subSettings.shouldBeep.enabled
						) {
							return (
								<div key={subId} className="subWidget">
									<label
										className={classNames('sub', {
											active: subSettings[subId].enabled &&
												this.settings[widgetId].enabled
										})}
									>
										<input
											type="checkbox"
											checked={subSettings[subId].enabled}
											data-name={widgetId}
											data-sub-name={subId}
											onChange={this.toggleSubWidget}
										/>
										{_(subSettings[subId].text())}
									</label>
								</div>
							);
						}
						if (
							subId === 'beepVolume' &&
							this.settings.spotting.enabled &&
							this.settings.spotting.subSettings.shouldBeep.enabled
						) {
							return (
								<div key="beepVolume" className="subWidget">
									<label
										className="sub"
										style={{
											border: '2px solid rgba(90, 90, 90, 0)',
											color: 'white'
										}}
									>
										{`${'VOL: '}`}
										<input
											type="range"
											min="0.1"
											max="1"
											step="0.05"
											value={this.settings.spotting.volume}
											data-name="spotting"
											onChange={this.changeBeepVolume}
										/>
										<div
											className="volValue"
											style={{
												marginLeft:	this.settings.spotting.volume === 1
													?	'5px'
													:	'11px'
											}}
										>
											{`${Math.round(this.settings.spotting.volume * 100)}%`}
										</div>
									</label>
								</div>
							);
						}
						if (
							subId === 'beepVolume' &&
							(
								!this.settings.spotting.enabled ||
								!this.settings.spotting.subSettings.shouldBeep.enabled
							)
						) {
							return null;
						}
						return (
							<div key={subId} className="subWidget">
								<label
									className={classNames('sub', {
										active: subSettings[subId].enabled &&
											this.settings[widgetId].enabled
									})}
								>
									<input
										type="checkbox"
										checked={subSettings[subId].enabled}
										data-name={widgetId}
										data-sub-name={subId}
										onChange={this.toggleSubWidget}
									/>
									{_(subSettings[subId].text())}
								</label>
							</div>
						);
					})}
				{widgetId === 'positionBarRelative' &&
					subSettings &&
					Object.keys(subSettings).map((subId) => {
						if (
							subId === 'showRanking' &&
							this.settings.positionBarRelative.enabled &&
							this.settings.positionBarRelative.subSettings.showRanking.enabled
						) {
							return (
								<div key={subId} className="subWidget">
									<label
										className={classNames('sub', {
											active: subSettings[subId].enabled &&
												this.settings[widgetId].enabled
										})}
									>
										<input
											type="checkbox"
											checked={subSettings[subId].enabled}
											data-name={widgetId}
											data-sub-name={subId}
											onChange={this.toggleSubWidget}
										/>
										{_(subSettings[subId].text())}
										<button
											className={classNames('rankInvert', {
												active: this.rankInvertRelative
											})}
											onClick={this.toggleRankInvertRelative}
										>
											{`${'INVERT'}`}
										</button>
									</label>
								</div>
							);
						}
						if (
							subId === 'numberDrivers' &&
							!this.settings.positionBarRelative.enabled
						) {
							return (
								<div key={subId} className="subWidget">
									<label
										className="sub"
										style={{
											border: '2px solid rgba(90, 90, 90, 0)',
											color: 'rgba(170, 170, 170, 1'
										}}
									>
										{_(subSettings[subId].text())}
										<button
											className={classNames('num3', {
												active: false
											})}
											style={{
												border: '1px solid rgba(90, 90, 90, 1)',
												background: this.driverNum === 3
													?	'rgba(90, 90, 90, 1)'
													:	undefined
											}}
											onClick={this.driverNumTo3}
										>
											{`${'3'}`}
										</button>
										<button
											className={classNames('num2', {
												active: false
											})}
											style={{
												border: '1px solid rgba(90, 90, 90, 1)',
												background: this.driverNum === 2
													?	'rgba(90, 90, 90, 1)'
													:	undefined
											}}
											onClick={this.driverNumTo2}
										>
											{`${'2'}`}
										</button>
										<button
											className={classNames('num1', {
												active: false
											})}
											style={{
												border: '1px solid rgba(90, 90, 90, 1)',
												background: this.driverNum === 1
													?	'rgba(90, 90, 90, 1)'
													:	undefined
											}}
											onClick={this.driverNumTo1}
										>
											{`${'1'}`}
										</button>
									</label>
								</div>
							);
						}
						if (
							subId === 'numberDrivers' &&
							this.settings.positionBarRelative.enabled
						) {
							return (
								<div key={subId} className="subWidget">
									<label
										className="sub"
										style={{
											border: '2px solid rgba(90, 90, 90, 0)',
											color: 'white'
										}}
									>
										{_(subSettings[subId].text())}
										<button
											className={classNames('num3', {
												active: this.driverNum === 3
											})}
											onClick={this.driverNumTo3}
										>
											{`${'3'}`}
										</button>
										<button
											className={classNames('num2', {
												active: this.driverNum === 2
											})}
											onClick={this.driverNumTo2}
										>
											{`${'2'}`}
										</button>
										<button
											className={classNames('num1', {
												active: this.driverNum === 1
											})}
											onClick={this.driverNumTo1}
										>
											{`${'1'}`}
										</button>
									</label>
								</div>
							);
						}
						return (
							<div key={subId} className="subWidget">
								<label
									className={classNames('sub', {
										active: subSettings[subId].enabled &&
											this.settings[widgetId].enabled
									})}
								>
									<input
										type="checkbox"
										checked={subSettings[subId].enabled}
										data-name={widgetId}
										data-sub-name={subId}
										onChange={this.toggleSubWidget}
									/>
									{_(subSettings[subId].text())}
								</label>
							</div>
						);
					})}
				{widgetId === 'tvTower' &&
					subSettings &&
					Object.keys(subSettings).map((subId) => {
						if (
							this.settings.tvTower.subSettings.hLogoUrl.enabled &&
							subId === 'hLogoUrl'
						) {
							return (
								<div
									key={subId}
									className={classNames(
										'subWidget',
										{
											urlInput: true
										}
									)}
								>
									<label className="sub">
										{_(subSettings[subId].text())}
										<input
											type="text"
											className="urlInput"
											value={(this.hLogoUrl === '' &&
												!this.logoUrlEdit
												?	`${_('Current Logo:')} ${this.hLogoUrl} - ${_('Click here to change')}`
												:	this.logoUrlEdit
													?	this.hLogoUrl
													:	`${_('Current Logo:')} ${this.hLogoUrl} - ${_('Click here to change')}`
											)}
											onChange={this.changeLogoUrl}
											onClick={this.emptyUrl}
										/>
									</label>
								</div>
							);
						}
						if (
							subId === 'showRanking' &&
							this.settings.tvTower.enabled &&
							this.settings.tvTower.subSettings.showRanking.enabled
						) {
							return (
								<div key={subId} className="subWidget">
									<label
										className={classNames('sub', {
											active: subSettings[subId].enabled &&
												this.settings[widgetId].enabled
										})}
									>
										<input
											type="checkbox"
											checked={subSettings[subId].enabled}
											data-name={widgetId}
											data-sub-name={subId}
											onChange={this.toggleSubWidget}
										/>
										{_(subSettings[subId].text())}
										<button
											className={classNames('rankInvert', {
												active: this.rankInvert
											})}
											onClick={this.toggleRankInvert}
										>
											{`${'INVERT'}`}
										</button>
									</label>
								</div>
							);
						}
						return (
							<div key={subId} className="subWidget">
								<label
									className={classNames('sub', {
										active: subSettings[subId].enabled &&
											this.settings[widgetId].enabled
									})}
								>
									<input
										type="checkbox"
										checked={subSettings[subId].enabled}
										data-name={widgetId}
										data-sub-name={subId}
										onChange={this.toggleSubWidget}
									/>
									{_(subSettings[subId].text())}
								</label>
							</div>
						);
					})}
				{widgetId !== 'positionBarRelative' &&
					widgetId !== 'tvTower' &&
					widgetId !== 'manualStart' &&
					widgetId !== 'spotting' &&
					subSettings &&
					Object.keys(subSettings).map((subId) => {
						return (
							<div key={subId} className="subWidget">
								<label
									className={classNames('sub', {
										active: subSettings[subId].enabled &&
											this.settings[widgetId].enabled
									})}
								>
									<input
										type="checkbox"
										checked={subSettings[subId].enabled}
										data-name={widgetId}
										data-sub-name={subId}
										onChange={this.toggleSubWidget}
									/>
									{_(subSettings[subId].text())}
								</label>
							</div>
						);
					})}
			</div>
		);
	}
}

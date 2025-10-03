import {
	classNames,
	ePlayerDriverDataIndex,
	ePlayerIsFocus,
	eCurrentSlotId,
	INVALID,
	mpsToKph,
	mpsToMph,
	rpsToRpm,
	// showDebugMessageSmall,
	widgetSettings
} from './../../lib/utils';
import {
	IWidgetSetting,
	lowPerformanceMode,
	highPerformanceMode,
	showAllMode
} from '../app/app';
import { action, observable } from 'mobx';
import { EEngineType } from './../../types/r3eTypes';
import { observer } from 'mobx-react';
import _ from './../../translate';
import r3e, {
	registerUpdate,
	unregisterUpdate,
	nowCheck
} from './../../lib/r3e';
import React from 'react';
import style from './motec.scss';

interface IProps extends React.HTMLAttributes<HTMLDivElement> {
	settings: IWidgetSetting;
}

@observer
export default class Motec extends React.Component<IProps, {}> {
	@observable
	speed = INVALID;

	@observable
	rpm = 0;

	@observable
	maxRpm = 0;

	@observable
	upshiftRps = 0;

	@observable
	gear = 0;

	@observable
	limiter = false;

	@observable
	engineMap = 0;

	@observable
	engineBrake = 0;

	@observable
	tractionLevel = 0;

	@observable
	brakeBias = 0;

	gearNameLookup = {};

	@observable
	lastCheck = 0;

	@observable
	lastBlinkTime = -1;

	@observable
	gearColor = 'white';

	@observable
	sessionType = -1;

	@observable
	sessionPhase = -1;

	@observable
	driverDataIndex = -1;

	@observable
	engineState = -1;

	@observable
	playerDriverDataIndex = -1;

	@observable
	playerIsFocus = false;

	@observable
	currentSlotId = -1;

	constructor(props: IProps) {
		super(props);

		registerUpdate(this.update);

		const isElectric =
			r3e.data.VehicleInfo.EngineType === EEngineType.Electric;

		this.gearNameLookup = isElectric
			? {
					'-1': 'R',
					0: 'N',
					1: 'D',
					2: 'S'
			  }
			: {
					'-1': 'R',
					0: 'N'
			  };
	}

	componentWillUnmount() {
		unregisterUpdate(this.update);
	}

	@action
	private update = () => {
		if (
			r3e.data.PitLimiter > 0 &&
			r3e.data.EngineRps > 10 &&
			this.props.settings.subSettings.plBlink.enabled
		) {
			if (!this.props.settings.subSettings.plBBlink.enabled
			) {
				const diff = nowCheck - this.lastBlinkTime;
				if (
					diff > 250 &&
					diff < 500
				) {
					this.gearColor = 'red';
				}
				if (
					diff > 500
				) {
					this.gearColor = 'blue';
					this.lastBlinkTime = nowCheck;
				}
			} else {
				this.gearColor = this.rpm > this.maxRpm * 0.97
					?	'#fe0000'
					:	this.rpm > this.upshiftRps * 0.92
						?	'lime'
						:	'white';
				this.lastBlinkTime = nowCheck;
			}
		} else {
			this.gearColor = this.rpm > this.maxRpm * 0.97
				?	'#fe0000'
				:	this.rpm > this.upshiftRps * 0.92
					?	'lime'
					:	'white';
			this.lastBlinkTime = nowCheck;
		}

		if (
			(
				highPerformanceMode &&
				nowCheck - this.lastCheck >= 16
			) ||
			(
				lowPerformanceMode &&
				nowCheck - this.lastCheck >= 16
			) ||
			(
				!lowPerformanceMode &&
				!highPerformanceMode &&
				nowCheck - this.lastCheck >= 16
			)
		) {
			this.playerDriverDataIndex = ePlayerDriverDataIndex;
			this.playerIsFocus = ePlayerIsFocus;
			this.currentSlotId = eCurrentSlotId;
			if (r3e.data && this.currentSlotId !== -1 && !this.playerIsFocus) {
				this.driverDataIndex = -1;
				for (let i = 0; i < r3e.data.DriverData.length; i++) {
					if (r3e.data.DriverData[i].DriverInfo.SlotId === this.currentSlotId) {
						this.driverDataIndex = i;
						break;
					}
				}
			}
			if (this.playerIsFocus) { this.driverDataIndex = this.playerDriverDataIndex; }
			if (this.driverDataIndex !== -1) {
				this.engineState =
					r3e.data !== undefined &&
					r3e.data.DriverData !== undefined &&
					r3e.data.DriverData[this.driverDataIndex] !== undefined
					?	r3e.data.DriverData[this.driverDataIndex].EngineState
					:	2;
			}
			this.lastCheck = nowCheck;
			this.speed = r3e.data.CarSpeed;
			this.rpm = rpsToRpm(r3e.data.EngineRps);
			this.maxRpm = rpsToRpm(r3e.data.MaxEngineRps);
			this.upshiftRps = rpsToRpm(r3e.data.UpshiftRps);
			this.gear = r3e.data.Gear;
			this.limiter = r3e.data.PitLimiter > 0 && this.engineState > 0
				?	true
				:	false;
			this.engineMap = r3e.data.EngineMapSetting;
			this.engineBrake = r3e.data.EngineBrakeSetting;
			this.brakeBias = 100 - (r3e.data.BrakeBias * 100);
			this.tractionLevel = r3e.data.TractionControlSetting;
			this.sessionType = r3e.data.SessionType;
			this.sessionPhase = r3e.data.SessionPhase;
		}
	};

	render() {
		if (
			this.sessionType === 2 &&
			this.sessionPhase === 1
		) { return null; }
		const showECU = this.props.settings.subSettings.showECU.enabled &&
			(
				showAllMode ||
				(
					this.playerIsFocus &&
					r3e.data.GameInReplay < 1
				)
			);
		const isGoing = this.speed > 3 && this.speed.toString().indexOf('E') === -1;
		return (
			<div
				{...widgetSettings(this.props)}
				className={classNames(style.motec, this.props.className, {
					shouldShow: this.speed !== INVALID,
					plBBlink:
						this.props.settings.subSettings.plBlink.enabled &&
						this.props.settings.subSettings.plBBlink.enabled &&
						(showAllMode || this.limiter),
					showEM:	showAllMode || (this.engineMap !== -1 && r3e.data.GameInReplay < 1),
					showTC:	showAllMode || (this.tractionLevel !== -1 && r3e.data.GameInReplay < 1)
				})}
			>
				{/* Speed*/}
				<div
					className="speed mono"
					style={{
						color: this.engineState < 1 && !showAllMode
							?	'grey'
							:	this.engineState < 2 && !showAllMode
								?	'white'
								:	this.limiter
									?	this.gearColor
									:	'white',
						background: this.engineState === 1 && !showAllMode
							?	'rgba(0, 190, 0, 0.8)'
							:	this.engineState === 0 && !showAllMode
								?	'rgba(0, 0, 0, 1)'
								:	'rgba(0, 0, 0, 0)',
						border: this.engineState < 2 && !showAllMode
							?	'1px solid rgba(255, 255, 255, 1)'
							:	'0px solid white',
						borderRadius: this.engineState < 2 && !showAllMode
							?	'2px'
							:	'0px',
						padding: this.engineState < 2 && !showAllMode
							?	'0 2px 0 2px'
							:	'0 0 0 0',
						height: this.engineState < 2 && !showAllMode
							?	'30px'
							:	undefined,
						lineHeight: this.engineState < 2 && !showAllMode
							?	'30px'
							:	undefined,
						bottom: this.engineState < 2 && !showAllMode
							?	'3px'
							:	undefined
					}}
				>
					{
						showAllMode
							?	65
							:	this.engineState === 1
								?	`${'START'}`
								:	this.engineState === 0
									?	`${_('IGNITION')}`
									:	this.props.settings.subSettings.showMPH.enabled
										?	mpsToMph(this.speed).toFixed(0)
										:	mpsToKph(this.speed).toFixed(0)
					}
				</div>

				{/* RPM */}
				{(this.engineState === 2 || showAllMode) &&
					(
						< div className="rpm">
							<div
								className="rpmBar"
								style={{
									width: `${showAllMode
											?	50
											:	(this.rpm / this.maxRpm) * 100
										}%`,
									background: this.gearColor
								}}
							/>
						</div>
					)
				}
				{/* Gear */}
				<div
					className={classNames('gear mono', {
						noElectronics: !showECU
					})}
					style={{
						color: this.rpm > this.maxRpm * 0.97
							?	'#fe0000'
							:	this.rpm > this.upshiftRps * 0.92
								?	'lime'
								:	this.engineState === 0 && !showAllMode
									?	'silver'
									:	'white'
					}}
				>
					{
						showAllMode
						?	2
						:	this.engineState < 1
							?	`${''}`
							:	this.gearNameLookup[this.gear] || this.gear
					}
				</div>
				{
					this.props.settings.subSettings.showECU.enabled &&
					showECU &&
					(
						showAllMode ||
						(
							this.playerIsFocus &&
							this.engineMap !== -1 &&
							this.engineState > 0
						)
					) && (
						<div
							className="engineMapBox"
							style={{
								background: this.engineState < 1 && !showAllMode
									? 'black'
									: undefined
							}}
						>
							<div
								className="engineMapLabel mono"
								style={{
									color: this.engineState > 0 || showAllMode
										?	'white'
										:	'silver'
								}}
							>
								{`${'EM:'}`}
							</div>
							<div
								className="engineMap mono"
								style={{
									color: this.engineState > 0 || showAllMode
										? 'white'
										: 'silver'
								}}
							>
								{
									`${
										this.engineMap !== -1
										?	this.engineMap
										:	2
									}`
								}
							</div>
						</div>
					)
				}
				{
					this.props.settings.subSettings.showECU.enabled &&
					showECU &&
					(
						showAllMode ||
						(
							this.playerIsFocus &&
							this.engineBrake !== -1 &&
							this.engineState > 0
						)
					) && (
						<div
							className="engineBrakeBox"
							style={{
								background: this.engineState < 1 && !showAllMode
									? 'black'
									: undefined
							}}
						>
							<div
								className="engineBrakeLabel mono"
								style={{
									color: this.engineState > 0 || showAllMode
										? 'white'
										: 'silver'
								}}
							>
								{`${'EB:'}`}
							</div>
							<div
								className="engineBrake mono"
								style={{
									color: this.engineState > 0 || showAllMode
										? 'white'
										: 'silver'
								}}
							>
								{
									`${
										this.engineBrake !== -1
										?	this.engineBrake
										:	3
									}`
								}
							</div>
						</div>
					)
				}
				{
					this.props.settings.subSettings.showECU.enabled &&
					showECU &&
					(
						showAllMode ||
						(
							this.playerIsFocus &&
							this.tractionLevel !== -1 &&
							this.engineState > 0
						)
					) && (
						(
							this.props.settings.subSettings.showTCPercent.enabled && (isGoing || showAllMode) && (
								<div
									className="tractionLevelBox"
									style={{
										background: this.engineState < 1 && !showAllMode
											? 'black'
											: undefined
									}}
								>
									<div
										className="tractionLevelLabel mono"
										style={{
											color: this.engineState > 0 || showAllMode
												? 'white'
												: 'silver'
										}}
									>
										{`${'TC:'}`}
									</div>
									<div
										className="tractionLevel mono"
										style={{
											color: this.engineState > 0 || showAllMode
												?	'white'
												:	'silver',
											left: Math.round(r3e.data.TractionControlPercent) === 100
												?	'14px'
												:	Math.round(r3e.data.TractionControlPercent) === 0
													?	'23px'
													:	undefined
										}}
									>
										{
											`${
												this.tractionLevel !== -1 && !showAllMode
												?	Math.round(r3e.data.TractionControlPercent)
												:	66
											}%`
										}
									</div>
								</div>
							)
						) || (
							<div
								className="tractionLevelBox"
								style={{
									background: this.engineState < 1 && !showAllMode
										? 'black'
										: undefined
								}}
							>
								<div
									className="tractionLevelLabel mono"
									style={{
										color: this.engineState > 0 || showAllMode
											? 'white'
											: 'silver'
									}}
								>
									{`${'TC:'}`}
								</div>
								<div
									className="tractionLevel mono"
									style={{
										color: this.engineState > 0 || showAllMode
											? 'white'
											: 'silver'
									}}
								>
									{
										`${
											this.tractionLevel !== -1
											?	this.tractionLevel
											:	3
										}`
									}
								</div>
							</div>
						)
					)
				}
				{
					this.props.settings.subSettings.showECU.enabled &&
					showECU &&
					(
						showAllMode ||
						(
							this.playerIsFocus &&
							this.engineState > 0
						)
					) && (
						<div
							className="brakeBiasBox"
							style={{
								background: this.engineState < 1 && !showAllMode
									?	'black'
									:	undefined
							}}
						>
							<div
								className="brakeBiasLabel mono"
								style={{
									color: this.engineState > 0 || showAllMode
										? 'white'
										: 'silver'
								}}
							>
								{`${'BB:'}`}
							</div>
							<div
								className="brakeBias mono"
								style={{
									color: this.engineState > 0 || showAllMode
										? 'white'
										: 'silver'
								}}
							>
								{
									`${
										this.brakeBias
									}%`
								}
							</div>
						</div>
					)
				}
			</div>
		);
	}
}

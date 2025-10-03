import {
	classNames,
	ePlayerIsFocus,
	INVALID,
	// showDebugMessageSmall,
	// showDebugMessage,
	widgetSettings
} from './../../lib/utils';
import {
	IWidgetSetting,
	eIsLeaderboard,
	eIsHillClimb,
	lowPerformanceMode,
	highPerformanceMode,
	// eDriverDiffs,
	showAllMode
} from '../app/app';
import { action, observable } from 'mobx';
import { ESession, ICutTrackPenalties } from './../../types/r3eTypes';
import { observer } from 'mobx-react';
import _ from './../../translate';
import getPitEntrance from './../../lib/trackDetails';
import r3e, {
	registerUpdate,
	unregisterUpdate,
	nowCheck
} from './../../lib/r3e';
import React from 'react';
import style from './info.scss';
import SvgIcon from '../svgIcon/svgIcon';

interface IProps extends React.HTMLAttributes<HTMLDivElement> {
	settings: IWidgetSetting;
}

@observer
export default class Info extends React.Component<IProps, {}> {
	@observable
	currentLapValid = INVALID;

	@observable
	sessionType = -1;

	@observable
	sessionPhase = -1;

	@observable
	completedLaps = 0;

	@observable
	lapTimeBestSelf = INVALID;

	@observable
	penaltyLap = -1;

	@observable
	maxIncidentPoints = -1;

	@observable
	myIncidentPoints = -1;

	@observable
	showIncidentsUntil = -1;

	@observable
	penalties: ICutTrackPenalties = {
		DriveThrough: 0,
		StopAndGo: 0,
		PitStop: 0,
		TimeDeduction: 0,
		SlowDown: 0
	};

	@observable
	eValues = {
		TractionControl: -99,
		BrakeBias: -99,
		EngineBraking: -99,
		EngineMap: -99
	};

	@observable
	eTimes = {
		PitRequest: -1,
		TractionControl: -1,
		BrakeBias: -1,
		EngineBraking: -1,
		EngineMap: -1
	};

	eTexts = {
		PitRequest: _('Pit-Stop requested'),
		TractionControl: _('Traction Control:'),
		BrakeBias: _('Brake Bias:'),
		EngineBraking: _('Engine Braking:'),
		EngineMap: _('Engine Map:')
	};

	@observable
	penaltyTimes: ICutTrackPenalties = {
		DriveThrough: 0,
		StopAndGo: 0,
		PitStop: 0,
		TimeDeduction: 0,
		SlowDown: 0
	};

	penaltyTexts = {
		DriveThrough: _('Drive Through Penalty'),
		StopAndGo: _('Stop And Go Penalty'),
		PitStop: _('Pit Stop Penalty'),
		TimeDeduction: _('Time Deduction Penalty'),
		SlowDown: _('Slow Down Penalty')
	};

	@observable
	penaltyLaps = {
		DriveThrough: -1,
		StopAndGo: -1
	};

	@observable
	notInRace = false;

	@observable
	hasValidLap = true;

	@observable
	showLapInvalid = true;

	@observable
	showNextLapInvalid = false;

	@observable
	lastCheck = 0;

	@observable
	playerIsFocus = false;

	@observable
	isLeaderboard = false;

	@observable
	isHillClimb = false;

	@observable
	lapDistance = -1;

	@observable
	pitEntrance = -1;

	@observable
	pitDistance = -1;

	constructor(props: IProps) {
		super(props);

		registerUpdate(this.update);
	}

	componentWillUnmount() {
		unregisterUpdate(this.update);
	}

	@action
	private update = () => {
		if (
			(
				highPerformanceMode &&
				nowCheck - this.lastCheck >= 33
			) ||
			(
				lowPerformanceMode &&
				nowCheck - this.lastCheck >= 266
			) ||
			(
				!lowPerformanceMode &&
				!highPerformanceMode &&
				nowCheck - this.lastCheck >= 66
			)
		) {
			this.lastCheck = nowCheck;
			this.playerIsFocus = ePlayerIsFocus;
			this.currentLapValid = r3e.data.CurrentLapValid;
			this.sessionType = r3e.data.SessionType;
			this.sessionPhase = r3e.data.SessionPhase;
			this.isLeaderboard = eIsLeaderboard;
			this.isHillClimb = eIsHillClimb;
			this.penalties = showAllMode
				?	{
						DriveThrough: 1,
						StopAndGo: 0,
						PitStop: 0,
						TimeDeduction: 0,
						SlowDown: 0
					}
				:	r3e.data.Penalties;
			this.completedLaps = r3e.data.CompletedLaps;
			this.lapTimeBestSelf = r3e.data.LapTimeBestSelf;
			this.notInRace = this.sessionType !== ESession.Race;
			this.hasValidLap =
				(
					this.currentLapValid > 0 &&
					(
						this.completedLaps > 0 ||
						this.isLeaderboard ||
						r3e.data.LapValidState === 0
					)
				) ||
				(
					this.sessionType === ESession.Qualify &&
					this.lapTimeBestSelf === INVALID
				) ||
				this.isHillClimb;
			this.showLapInvalid = this.notInRace && !this.hasValidLap;
			this.showNextLapInvalid = this.notInRace && r3e.data.LapValidState === 2;
			this.lapDistance = r3e.data.LapDistance;
			this.pitEntrance = getPitEntrance(r3e.data.TrackId, r3e.data.LayoutId);
			this.pitDistance = this.lapDistance > this.pitEntrance
				? Math.ceil(this.pitEntrance + (r3e.data.LayoutLength - this.lapDistance))
				: Math.ceil(this.pitEntrance - this.lapDistance);

			if (
				this.penalties.DriveThrough > 0 &&
				this.penaltyLaps.DriveThrough === -1
			) {
				this.penaltyLaps.DriveThrough = this.completedLaps;
			}
			if (
				this.penaltyLaps.DriveThrough !== -1 &&
				this.penalties.DriveThrough <= 0
			) {
				this.penaltyLaps.DriveThrough = -1;
			}
			if (
				this.penalties.StopAndGo > 0 &&
				this.penaltyLaps.StopAndGo === -1
			) {
				this.penaltyLaps.StopAndGo = this.completedLaps;
			}
			if (
				this.penaltyLaps.StopAndGo !== -1 &&
				this.penalties.StopAndGo <= 0
			) {
				this.penaltyLaps.StopAndGo = -1;
			}

			if (
				this.penalties.DriveThrough > 0 &&
				this.penaltyTimes.DriveThrough === 0
			) {
				this.penaltyTimes.DriveThrough =
					showAllMode
					?	1
					:	r3e.data.DriverData[r3e.data.Position - 1].PenaltyReason;
			}
			if (
				this.penalties.DriveThrough <= 0 &&
				this.penaltyTimes.DriveThrough !== 0
			) {
				this.penaltyTimes.DriveThrough = 0;
			}
			if (
				this.penalties.StopAndGo > 0 &&
				this.penaltyTimes.StopAndGo === 0
			) {
				this.penaltyTimes.StopAndGo =
					r3e.data.DriverData[r3e.data.Position - 1].PenaltyReason;
			}
			if (
				this.penalties.StopAndGo <= 0 &&
				this.penaltyTimes.StopAndGo !== 0
			) {
				this.penaltyTimes.StopAndGo = 0;
			}
			if (
				this.penalties.PitStop > 0 &&
				this.penaltyTimes.PitStop === 0
			) {
				this.penaltyTimes.PitStop =
					r3e.data.DriverData[r3e.data.Position - 1].PenaltyReason;
			}
			if (
				this.penalties.PitStop <= 0 &&
				this.penaltyTimes.PitStop !== 0
			) {
				this.penaltyTimes.PitStop = 0;
			}
			if (
				this.penalties.TimeDeduction > 0 &&
				this.penaltyTimes.TimeDeduction === 0
			) {
				this.penaltyTimes.TimeDeduction =
					r3e.data.DriverData[r3e.data.Position - 1].PenaltyReason;
			}
			if (
				this.penalties.TimeDeduction <= 0 &&
				this.penaltyTimes.TimeDeduction !== 0
			) {
				this.penaltyTimes.TimeDeduction = 0;
			}
			if (
				this.penalties.SlowDown > 0 &&
				this.penaltyTimes.SlowDown === 0
			) {
				this.penaltyTimes.SlowDown =
					r3e.data.DriverData[r3e.data.Position - 1].PenaltyReason;
			}
			if (
				this.penalties.SlowDown <= 0 &&
				this.penaltyTimes.SlowDown !== 0
			) {
				this.penaltyTimes.SlowDown = 0;
			}

			// Electronic Changes
			this.eTimes.PitRequest =
				r3e.data.PitState === 1 &&
				r3e.data.InPitlane < 1
				?	nowCheck + 1000
				:	0;

			const tControl = r3e.data.TractionControlSetting;
			if (
				 tControl !== this.eValues.TractionControl || showAllMode
			) {
				if (this.eValues.TractionControl !== -99) {
					this.eTimes.TractionControl = nowCheck + 5000;
				}
				this.eValues.TractionControl = showAllMode
				?	3
				:	tControl;
			}

			const bBias = 100 - (r3e.data.BrakeBias * 100);
			if (
				 bBias !== this.eValues.BrakeBias
			) {
				if (this.eValues.BrakeBias !== -99) {
					this.eTimes.BrakeBias = nowCheck + 5000;
				}
				this.eValues.BrakeBias = bBias;
			}

			const eBraking = r3e.data.EngineBrakeSetting;
			if (
				 eBraking !== this.eValues.EngineBraking
			) {
				if (this.eValues.EngineBraking !== -99) {
					this.eTimes.EngineBraking = nowCheck + 5000;
				}
				this.eValues.EngineBraking = eBraking;
			}

			const eMap = r3e.data.EngineMapSetting;
			if (
				 eMap !== this.eValues.EngineMap
			) {
				if (this.eValues.EngineMap !== -99) {
					this.eTimes.EngineMap = nowCheck + 5000;
				}
				this.eValues.EngineMap = eMap;
			}
			this.maxIncidentPoints = r3e.data.MaxIncidentPoints !== undefined
				?	r3e.data.MaxIncidentPoints
				:	-1;
			if (r3e.data.IncidentPoints && r3e.data.IncidentPoints !== this.myIncidentPoints) {
				this.myIncidentPoints = r3e.data.IncidentPoints;
				this.showIncidentsUntil = nowCheck + 5000;
			}
		}
	};

	private getPenaltyReason(pType: string, pReason: number) {
		let reasonText = '';
		switch (pType) {
			case 'DriveThrough':
				switch (pReason) {
					case 1:
						reasonText =
							_('Reason: Track Limits Abuse');
						break;
					case 2:
						reasonText =
							_('Reason: Speeding in the Pitlane');
						break;
					case 3:
						reasonText =
							_('Reason: False Start');
						break;
					case 4:
						reasonText =
							_('Reason: Ignoring Blue Flags');
						break;
					case 5:
						reasonText =
							_('Reason: Driving too slow');
						break;
					case 6:
						reasonText =
							_('Reason: Illegally Passing before Green');
						break;
					case 7:
						reasonText =
							_('Reason: Illegally Passing before the Finish');
						break;
					case 8:
						reasonText =
							_('Reason: Illegally Passing before the Pit Entrance');
						break;
					case 9:
						reasonText =
							_('Reason: Ignoring Slow Down Warnings');
						break;
					case 10:
						reasonText =
							_('Reason: Accumulating the Maximum Number of Penalties Permitted');
						break;
				}
				break;
			case 'StopAndGo':
				switch (pReason) {
					case 2:
						reasonText =
							_('Reason: Track Limits Abuse');
						break;
					case 3:
						reasonText =
							_('Reason: Overtaking under Yellow');
						break;
					case 4:
						reasonText =
							_('Reason: Accumulating the Maximum Number of Penalties Permitted');
						break;
				}
				break;
			case 'PitStop':
				switch (pReason) {
					case 1:
						reasonText =
							_('Reason: Ignoring Mandatory Pit-Stop');
						break;
					case 2:
						reasonText =
							_('Reason: Accumulating the Maximum Number of Penalties Permitted');
						break;
				}
				break;
			case 'TimeDeduction':
				switch (pReason) {
					case 1:
						reasonText =
							_('Reason: Mandatory Pit-Stop taken outside Pit-Window');
						break;
					case 2:
						reasonText =
							_('Reason: Ignoring the minimum Pit-Stop duration');
						break;
					case 3:
						reasonText =
							_('Reason: Accumulating the Maximum Number of Penalties Permitted');
						break;
				}
				break;
			case 'SlowDown':
				switch (pReason) {
					case 1:
						reasonText =
							_('Reason: Track Limits Abuse');
						break;
					case 2:
						reasonText =
							_('Reason: Multiple Track Limit Abuse');
						break;
					case 3:
						reasonText =
							_('Reason: Accumulating the Maximum Number of Penalties Permitted');
						break;
				}
				break;
			case 'Disqualify':
				switch (pReason) {
					case 0:
						reasonText =
							_('Reason: False Start');
						break;
					case 1:
						reasonText =
							_('Reason: Speeding in the Pitlane');
						break;
					case 2:
						reasonText =
							_('Reason: Driving the wrong Way');
						break;
					case 3:
						reasonText =
							_('Reason: Entering Pit under Red');
						break;
					case 4:
						reasonText =
							_('Reason: Exiting Pits under Red');
						break;
					case 5:
						reasonText =
							_('Reason: Ignoring the Driver Change');
						break;
					case 6:
						reasonText =
							_('Reason: Multiple Drive Through Penalties in 1 Lap');
						break;
					case 8:
						reasonText =
							_('Reason: Ignoring Drive Through Penalty');
						break;
					case 9:
						reasonText =
							_('Reason: Ignoring Stop and Go Penalty');
						break;
					case 10:
						reasonText =
							_('Reason: Ignoring Pit-Stop Penalty');
						break;
					case 11:
						reasonText =
							_('Reason: Ignoring Time Penalty');
						break;
					case 12:
						reasonText =
							_('Reason: Excessive Cutting of the Track');
						break;
					case 13:
						reasonText =
							_('Reason: Ignoring Blue Flags');
						break;
					case 14:
						reasonText =
							_('Reason: Accumulating the Maximum Number of Penalties Permitted');
						break;
				}
				break;
		}
		return reasonText;
	}

	render() {
		if (
			this.sessionType === 2 &&
			this.sessionPhase === 1
		) { return null; }
		const isGoing = r3e.data.CarSpeed > 3 && r3e.data.CarSpeed.toString().indexOf('E') === -1;
		const showIncPoints =
			showAllMode ||
			(
				this.playerIsFocus &&
				this.maxIncidentPoints > 0 &&
				this.showIncidentsUntil >= nowCheck &&
				this.sessionType !== 0 &&
				this.sessionType !== 3
			);
		const warnInc =
			showIncPoints &&
			this.myIncidentPoints >= (this.maxIncidentPoints * 0.9);

		return (
			<div
				className={classNames(style.info, this.props.className)}
				{...widgetSettings(this.props)}
			>
				{/* Loop through all penalties and check if they should show */}
				{
					(
						Object.keys(this.penalties)
						.filter((penaltyKey) => this.penalties[penaltyKey] > 0)
						.map((penaltyKey) => {
							if (!this.playerIsFocus) { return null; }
							return (
								<div key={penaltyKey} className="warning">
									<SvgIcon
										src={require('./../../img/icons/warning.svg')}
									/>
										{
											`${
												this.penaltyTexts[penaltyKey] ||
												penaltyKey
											} \n  ${
												this.getPenaltyReason(penaltyKey, this.penaltyTimes[penaltyKey])
											} ${
												penaltyKey === 'DriveThrough'
												?	(
														(this.penaltyLaps.DriveThrough + 3) -
														this.completedLaps
													) > 1
														?	'\n  ' + _('Serve within')
														:	'\n  ' + _('Serve')
												:	penaltyKey === 'StopAndGo'
													?	(
															(this.penaltyLaps.DriveThrough + 3) -
															this.completedLaps
														) > 1
															?	'\n  ' + _('Serve within')
															:	'\n  ' + _('Serve')
													:	''
											} ${
												penaltyKey === 'DriveThrough'
												?	(
														(this.penaltyLaps.DriveThrough + 3) -
														this.completedLaps
													) > 1
													?	(
															(this.penaltyLaps.DriveThrough + 3) -
															this.completedLaps
														)
													:	' ' + _('this lap')
												:	penaltyKey === 'StopAndGo'
													?	(
															(this.penaltyLaps.StopAndGo + 3) -
															this.completedLaps
														) > 1
														?	(
																(this.penaltyLaps.StopAndGo + 3) -
																this.completedLaps
															)
														:	' ' + _('this lap')
													:	''
											}${
												penaltyKey === 'DriveThrough'
												?	(
														(this.penaltyLaps.DriveThrough + 3) -
														this.completedLaps
													) > 1
													?	' ' + _('laps')
													:	''
												:	penaltyKey === 'StopAndGo'
													?	(
															(this.penaltyLaps.StopAndGo + 3) -
															this.completedLaps
														) > 1
														?	' ' + _('laps')
														:	''
													:	''
											}`
										}
								</div>
							);
						})
					)
				}
				{(this.showLapInvalid || showAllMode) && (
					<div className="warning">
						<SvgIcon
							src={require('./../../img/icons/warning.svg')}
						/>
						{_('This lap will not count')}
					</div>
				)}
				{(this.showNextLapInvalid || showAllMode) && (
					<div className="warning">
						<SvgIcon
							src={require('./../../img/icons/warning.svg')}
						/>
						{_('Next lap will not count')}
					</div>
				)}
				{
					(
						Object.keys(this.eTimes)
						.filter((eKey) => this.eTimes[eKey] >= nowCheck)
						.map((eKey) => {
							if (!this.playerIsFocus) { return null; }
							return (
								<div key={eKey} className="warning">
									<SvgIcon
										src={require('./../../img/icons/info.svg')}
									/>
										{
										eKey === 'PitRequest'
											?	this.pitDistance <= 500
												?	`${_('Pit-Stop requested - Pit In')}: ${this.pitDistance}m`
												:	`${_('Pit-Stop requested - Pit In')}`
											:	eKey === 'TractionControl' && (isGoing || showAllMode)
												?	`${this.eTexts[eKey]} ${this.eValues[eKey]} (${showAllMode ? 60 : Math.round(r3e.data.TractionControlPercent)} %)`
												:	`${this.eTexts[eKey]} ${this.eValues[eKey]}${eKey === 'BrakeBias' ? '%' : ''}`
										}
								</div>
							);
						})
					)
				}
				{
					showIncPoints && (
						<div
							className={classNames(
								'warning'
							)}
							style={{
								color: warnInc
									?	'rgb(255, 0, 0)'
									:	'rgb(255, 255, 255)'
							}}
						>
							<SvgIcon
								src={warnInc ? require('./../../img/icons/warning.svg') : require('./../../img/icons/info.svg')}
							/>
								{
									`${
										_('Incidents')
									}: ${
										showAllMode
										?	135
										:	this.myIncidentPoints === -1
											?	0
											:	this.myIncidentPoints
									} / ${
										showAllMode
										?	200
										:	this.maxIncidentPoints
									}`
								}
						</div>
					)
				}
			</div>
		);
	}
	/* render() {
		if (
			this.sessionType === 2 &&
			this.sessionPhase === 1
		) { return null; }
		return (
			<div
				className={classNames(style.info, this.props.className)}
				{...widgetSettings(this.props)}
			>
				{}
				{
					(
						Object.keys(this.eTimes)
						.filter((eKey) => this.eTimes[eKey] >= nowCheck)
						.map((eKey) => {
							if (!this.playerIsFocus) { return null; }
							return (
								<div key={eKey} className="warning">
									<SvgIcon
										src={require('./../../img/icons/info.svg')}
									/>
										{
											eKey === 'PitRequest'
											?	_('Pit-Stop requested - Pit In')
											:	`${
													this.eTexts[eKey]
												} ${
													this.eValues[eKey]
												}${
													eKey === 'BrakeBias'
													?	'%'
													:	''
												}`
										}
								</div>
							);
						})
					)
				}
				{
					(
						Object.keys(this.penalties)
						.filter((penaltyKey) => this.penalties[penaltyKey] > 0)
						.map((penaltyKey) => {
							if (!this.playerIsFocus) { return null; }
							return (
								<div key={penaltyKey} className="warning">
									<SvgIcon
										src={require('./../../img/icons/warning.svg')}
									/>
										{
											`${
												this.penaltyTexts[penaltyKey] ||
												penaltyKey
											} \n${
												this.getPenaltyReason(penaltyKey, this.penaltyTimes[penaltyKey])
											} ${
												penaltyKey === 'DriveThrough'
												?	(
														(this.penaltyLaps.DriveThrough + 3) -
														this.completedLaps
													) > 1
														?	'\n  Serve within'
														:	'\n  Serve'
												:	penaltyKey === 'StopAndGo'
													?	(
															(this.penaltyLaps.DriveThrough + 3) -
															this.completedLaps
														) > 1
															?	'\n  Serve within'
															:	'\n  Serve'
													:	penaltyKey === 'SlowDown'
														?	'\n Approximate Time to give back:'
														:	''
											} ${
												penaltyKey === 'DriveThrough'
												?	(
														(this.penaltyLaps.DriveThrough + 3) -
														this.completedLaps
													) > 1
													?	(
															(this.penaltyLaps.DriveThrough + 3) -
															this.completedLaps
														)
													:	' this lap'
												:	penaltyKey === 'StopAndGo'
													?	(
															(this.penaltyLaps.StopAndGo + 3) -
															this.completedLaps
														) > 1
														?	(
																(this.penaltyLaps.StopAndGo + 3) -
																this.completedLaps
															)
														:	' this lap'
													:	penaltyKey === 'SlowDown'
														?	eDriverDiffs[eCurrentSlotId][2][0]
														:	''
											}${
												penaltyKey === 'DriveThrough'
												?	(
														(this.penaltyLaps.DriveThrough + 3) -
														this.completedLaps
													) > 1
													?	' laps'
													:	''
												:	penaltyKey === 'StopAndGo'
													?	(
															(this.penaltyLaps.StopAndGo + 3) -
															this.completedLaps
														) > 1
														?	' laps'
														:	''
													:	penaltyKey === 'SlowDown'
														?	's'
														:	''
											}`
										}
								</div>
							);
						})
					)
				}
				{(this.showLapInvalid || showAllMode) && (
					<div className="warning">
						<SvgIcon
							src={require('./../../img/icons/warning.svg')}
						/>
						{_('This lap will not count')}
					</div>
				)}
			</div>
		);
	}*/
}

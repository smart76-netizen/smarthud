import {
	classNames,
	base64ToString,
	ePlayerSlotId,
	eCurrentSlotId,
	fancyTimeFormatGap,
	formatTime,
	getTimeUntilPit,
	getTimeUntilPitClosed,
	isRange,
	widgetSettings,
	getInitials,
	getRankingData,
	// showDebugMessageSmall,
	// resAspect,
	IRatingData,
	INVALID,
	getClassColor
} from './../../lib/utils';
import {
	ESession,
	IDriverData
} from './../../types/r3eTypes';
import {
	IWidgetSetting,
	lowPerformanceMode,
	highPerformanceMode,
	eLogoUrl,
	eDriverPitInfo,
	eDriverDiffs,
	eIsLeaderboard,
	eIsHillClimb,
	eRankInvert,
	IDriverDiffs,
	IDriverPitInfo,
	eDriverLapInfo,
	IDriverLapInfo,
	showAllMode
} from '../app/app';
import { action, observable } from 'mobx';
import { observer } from 'mobx-react';
import { times } from 'lodash-es';
import _ from './../../translate';
import r3e, {
	registerUpdate,
	unregisterUpdate,
	nowCheck
} from './../../lib/r3e';
import React from 'react';
import style from './tvTower.scss';

interface IProps extends React.HTMLAttributes<HTMLDivElement> {
	settings: IWidgetSetting;
}
interface IDriverInfo {
	isUser: boolean;
	id: number;
	name: string;
	shortName: string;
	performanceIndex: number;
	position: number;
	positionClass: number;
	meta?: IDriverData;
	lapDiff: number;
	diff: string | number;
	manufacturerId: number;
	bestLapTime: number;
	bestLapTimeLeader: number;
	bestLapTimeClass: number;
	pitting: number;
	currentTime: number;
	numPitstops: number;
	mandatoryPit: number;
	classId: number;
	classColor: string;
	tyreChoice: number;
	lapDistance: number;
	logoUrl: string;
	finishStatus: number;
	finishStatusText: string;
	lapPrevious: number;
	lapsDone: number;
	rankingData: IRatingData;
}

@observer
export default class TvTower extends React.Component<IProps, {}> {
	@observable
	drivers: IDriverInfo[] = [];

	@observable
	currentLap = INVALID;

	@observable
	maxLaps = INVALID;

	@observable
	pitState = INVALID;

	@observable
	sessionPhase = INVALID;

	@observable
	sessionTimeRemaining = INVALID;

	@observable
	classDriverCount = INVALID;

	@observable
	position = INVALID;

	@observable
	positionClass = INVALID;

	@observable
	sessionType = INVALID;

	@observable
	multiClass = false;

	@observable
	lapTimeCurrentSelf = INVALID;

	@observable
	playerCount = INVALID;

	@observable
	addPrefix = false;

	@observable
	mandatoryServed = false;

	@observable
	mandatoryActive = false;

	@observable
	playerPos = -1;

	@observable
	lastCheck = 0;

	@observable
	notInRacePhase = true;

	@observable
	theLogoUrl = './../../img/logo.png';

	playerPosition = INVALID;

	positionBarCount = 15;

	entryWidth = 148;

	classColorUpdate: number;

	@observable
	actualFirstLap = false;

	@observable
	incidentPoints = -1;

	@observable
	maxIncidentPoints = -1;

	@observable
	lastIncidentPoints = -1;

	@observable
	showIncUntil = -1;

	@observable
	singleplayerRace = false;

	@observable
	classPerformanceIndex = -1;

	@observable
	pitWindowStatus = -1;

	logoUrlp1 = 'https://game.raceroom.com/store/image_redirect?id=';
	logoUrlp2 = '&size=small';

	@observable
	playerSlotId = -1;

	@observable
	currentSlotId = -1;

	@observable
	isLeaderboard = false;

	@observable
	isHillClimb = false;

	@observable
	driverPitInfo: IDriverPitInfo = {};

	@observable
	gameInReplay = false;

	constructor(props: IProps) {
		super(props);

		registerUpdate(this.update);

		this.forceClassColorUpdate();
		this.classColorUpdate = setInterval(
			this.forceClassColorUpdate,
			10 * 1000
		);
	}
	componentWillUnmount() {
		clearInterval(this.classColorUpdate);
		unregisterUpdate(this.update);
	}

	@action
	private update = () => {
		if (
			(
				highPerformanceMode &&
				nowCheck - this.lastCheck >= 66
			) ||
			(
				lowPerformanceMode &&
				nowCheck - this.lastCheck >= 266
			) ||
			(
				!lowPerformanceMode &&
				!highPerformanceMode &&
				nowCheck - this.lastCheck >= 133
			)
		) {
			this.theLogoUrl = eLogoUrl;
			// showDebugMessage(`${this.theLogoUrl}`);
			this.lastCheck = nowCheck;
			this.playerSlotId = ePlayerSlotId;
			this.currentSlotId = eCurrentSlotId;
			this.sessionPhase = r3e.data.SessionPhase;
			this.sessionType = r3e.data.SessionType;
			this.isLeaderboard = eIsLeaderboard;
			this.isHillClimb = eIsHillClimb;
			this.driverPitInfo = eDriverPitInfo;
			this.gameInReplay = r3e.data.GameInReplay > 0;
			if ((!this.isLeaderboard && !this.isHillClimb) || showAllMode) {
				this.pitState = r3e.data.PitState;
				this.classDriverCount = 0;
				this.multiClass = false;
				this.playerCount = r3e.data.DriverData.length;
				this.mandatoryActive =
					this.pitWindowStatus !== -1 &&
					r3e.data.PitWindowStart !== -1 &&
					r3e.data.PitWindowEnd !== -1;
				this.singleplayerRace = false;

				this.incidentPoints = r3e.data.IncidentPoints !== undefined
					?	r3e.data.IncidentPoints
					:	-1;
				if (
					this.incidentPoints !== -1 &&
					this.incidentPoints !== this.lastIncidentPoints
				) {
					this.showIncUntil = nowCheck + 5000;
					this.lastIncidentPoints = this.incidentPoints;
				}
				this.maxIncidentPoints = r3e.data.MaxIncidentPoints;

				const driverData = r3e.data.DriverData.map(this.formatDriverData).filter(
					this.filterDriverData
				);

				this.calculateDiffs(driverData);

				this.playerPos = this.getPlayerPosition(driverData);
				this.drivers = driverData.map((driver) => {
					delete driver.meta;
					return driver;
				});

				this.currentLap = r3e.data.CompletedLaps + 1;
				this.maxLaps = r3e.data.NumberOfLaps;
				this.sessionTimeRemaining = r3e.data.SessionTimeRemaining;

				this.position = r3e.data.Position;
				this.positionClass = r3e.data.PositionClass;
				this.classPerformanceIndex = r3e.data.VehicleInfo.ClassPerformanceIndex;
				this.lapTimeCurrentSelf = r3e.data.LapTimeCurrentSelf;
				this.addPrefix = r3e.data.LapTimeBestSelf > -1;
				this.notInRacePhase =
					(
						this.sessionPhase < 4 &&
						r3e.data.CarSpeed < 5
					) ||
					this.sessionPhase < 3;
				this.pitWindowStatus = r3e.data.PitWindowStatus;
			}
		}
	};

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
		});
		return bestLap;
	};

	private getPlayerPosition = (driverData: IDriverInfo[]) => {
		let userPosition = 0;
		driverData.forEach((driver, i) => {
			if (driver.id === this.currentSlotId) {
				userPosition = i;
			}
		});
		return userPosition;
	};

	private filterDriverData = (driver: IDriverInfo) => {
		const isRaceSession = this.sessionType === ESession.Race;
		if (
			!isRaceSession &&
			driver.meta &&
			driver.meta.SectorTimeBestSelf.Sector3 === INVALID &&
			!driver.isUser
		) {
			return false;
		}
		return true;
	};

	private formatDriverData = (driver: IDriverData): IDriverInfo => {
		const isUser =
			this.currentSlotId === driver.DriverInfo.SlotId;
		if (
			driver.DriverInfo.ClassPerformanceIndex ===
			this.classPerformanceIndex
		) {
			this.classDriverCount += 1;
		} else {
			this.multiClass = true;
		}

		if (driver.DriverInfo.UserId === -1) { this.singleplayerRace = true; }

		const driverData = {
			isUser,
			id: driver.DriverInfo.SlotId,
			classId: driver.DriverInfo.ClassId,
			performanceIndex: driver.DriverInfo.ClassPerformanceIndex,
			name: base64ToString(driver.DriverInfo.Name),
			shortName: getInitials(base64ToString(driver.DriverInfo.Name)),
			position: driver.Place,
			positionClass: driver.PlaceClass,
			meta: driver,
			lapDiff: driver.CompletedLaps - r3e.data.CompletedLaps,
			diff: isUser ? this.getPlayerPositionText() : '',
			manufacturerId: driver.DriverInfo.ManufacturerId,
			bestLapTime: driver.SectorTimeBestSelf.Sector3,
			bestLapTimeLeader: r3e.data.SectorTimesSessionBestLap.Sector3,
			bestLapTimeClass:
				this.getBestLapClass(this.drivers, driver.DriverInfo.ClassPerformanceIndex),
			pitting: driver.InPitlane,
			currentTime: driver.LapTimeCurrentSelf,
			numPitstops: driver.NumPitstops,
			mandatoryPit: driver.PitStopStatus,
			classColor: getClassColor(driver.DriverInfo.ClassPerformanceIndex),
			tyreChoice: driver.TireSubtypeFront,
			lapDistance: driver.LapDistance,
			logoUrl: driver.DriverInfo.ManufacturerId > 0
				?	this.logoUrlp1 +
					driver.DriverInfo.ManufacturerId.toString() +
					this.logoUrlp2
				:	`${
						this.logoUrlp1
					}4596${
						this.logoUrlp2
					}`,
			finishStatus: this.gameInReplay &&
				driver.InPitlane &&
				this.driverPitInfo[driver.DriverInfo.SlotId] !== undefined &&
				Math.abs(this.driverPitInfo[driver.DriverInfo.SlotId][2] - this.driverPitInfo[driver.DriverInfo.SlotId][3]) < 2000 &&
				driver.EngineState === 0
				?	2
				:	driver.FinishStatus,
			finishStatusText: this.gameInReplay &&
				driver.InPitlane &&
				this.driverPitInfo[driver.DriverInfo.SlotId] !== undefined &&
				Math.abs(this.driverPitInfo[driver.DriverInfo.SlotId][2] - this.driverPitInfo[driver.DriverInfo.SlotId][3]) < 2000 &&
				driver.EngineState === 0
				?	'DNF'
				:	driver.FinishStatus === 0
					?	'running'
					:	driver.FinishStatus === 1
						?	'finished'
						:	driver.FinishStatus === 2
							?	'DNF'
							:	driver.FinishStatus === 3
								?	'DNQ'
								:	driver.FinishStatus === 4
									?	'DNS'
									:	driver.FinishStatus === 5
										?	'DQ'
										:	'none',
			lapPrevious: driver.SectorTimePreviousSelf.Sector3,
			lapsDone: driver.CompletedLaps,
			rankingData: getRankingData(driver.DriverInfo.UserId)
		};
		if (isUser) {
			this.mandatoryServed = driver.PitStopStatus === 1;
		}
		return driverData;
	};

	private forceClassColorUpdate() {
		r3e.data.DriverData.forEach((driver) => {
			getClassColor(driver.DriverInfo.ClassPerformanceIndex);
		});
	}

	private calculateDiffs(drivers: IDriverInfo[]) {
		const isRace = this.sessionType === ESession.Race;

		if (isRace) {
			this.calculateDiffsRace(drivers);
		} else {
			this.calculateDiffsQualify(drivers);
		}
	}

	private getStrengthOfField() {
		let sumUp = 0;
		let count = 0;
		this.drivers.forEach((driver) => {
			sumUp += driver.rankingData.Rating;
			count += 1;
		});
		return `${
			((sumUp / count) / 1000).toFixed(2)
		}K`;
	}

	private calculateDiffsQualify(drivers: IDriverInfo[]) {
		const userBestSector =
			r3e.data.SectorTimesBestSelf.Sector3 !== INVALID
				? r3e.data.SectorTimesBestSelf.Sector3
				: 0;

		drivers.forEach((driver, i) => {
			if (driver.isUser) {
				this.playerPosition = i + 1;
				return;
			}
			const diff =
				driver.meta ? driver.meta.SectorTimeBestSelf.Sector3 - userBestSector : 0;
			driver.diff =
				diff > 60
					? formatTime(diff, 'm:ss.SSS', this.addPrefix)
					: formatTime(diff, 's.SSS', this.addPrefix);
		});
	}

	private calculateDiffsRace(drivers: IDriverInfo[]) {
		const driversInfront = drivers.slice(0, this.position - 1);
		let infrontDiff = 0;
		driversInfront.reverse().forEach((driver) => {
			infrontDiff += driver.meta ? driver.meta.TimeDeltaBehind : 0;
			let gotLapped = false;
			if (
				driver.lapDiff === 1 &&
				driver.lapDistance > r3e.data.LapDistance
			) {
				gotLapped = true;
				driver.diff = `-${Math.abs(driver.lapDiff)} ${_(
								'lap'
						  )}`;
			}
			if (
				driver.lapDiff > 1
			) {
				gotLapped = true;
				if (
					driver.lapDistance > r3e.data.LapDistance
				) {
					driver.diff = `-${Math.abs(driver.lapDiff)} ${_(
									'laps'
							)}`;
				} else {
					const theLapDiff = driver.lapDiff - 1;
					driver.diff = theLapDiff > 1
						?	(driver.diff = `-${Math.abs(theLapDiff)} ${_(
								'laps'
							)}`)
						:	(driver.diff = `-${Math.abs(theLapDiff)} ${_(
								'lap'
							)}`);
				}
			}

			if (!gotLapped) {
				driver.diff =
					// eDriverDiffs[driver.id][1][0] < -60
					infrontDiff > 60
						? formatTime(infrontDiff * -1, 'm:ss.SSS')
						: formatTime(infrontDiff * -1, 's.SSS');
						// ? formatTime(eDriverDiffs[driver.id][1][0], 'm:ss.SSS')
						// : formatTime(eDriverDiffs[driver.id][1][0], 's.SSS');
			}
		});

		const driversAfter = drivers.slice(
			this.position,
			r3e.data.DriverData.length
		);
		let afterDiff = 0;
		driversAfter.forEach((driver) => {
			afterDiff += driver.meta ? driver.meta.TimeDeltaFront : 0;
			let gotLapped = false;
			if (
				driver.lapDiff === -1 &&
				driver.lapDistance < r3e.data.LapDistance
			) {
				gotLapped = true;
				driver.diff = `+${Math.abs(driver.lapDiff)} ${_(
								'lap'
						  )}`;
			}
			if (
				driver.lapDiff < -1
			) {
				gotLapped = true;
				if (
					driver.lapDistance < r3e.data.LapDistance
				) {
					driver.diff = `+${Math.abs(driver.lapDiff)} ${_(
									'laps'
							)}`;
				} else {
					const theLapDiff = driver.lapDiff + 1;
					driver.diff = theLapDiff < -1
						?	`+${Math.abs(theLapDiff)} ${_(
								'laps'
							)}`
						:	`+${Math.abs(theLapDiff)} ${_(
								'lap'
							)}`;
				}
			}
			if (!gotLapped) {
				driver.diff =
					afterDiff > 60
						? '+' + formatTime(afterDiff, 'm:ss.SSS')
						: '+' + formatTime(afterDiff, 's.SSS');
			}
		});
		this.playerPosition = this.position;
	}

	private getPlayerPositionText(): string {
		const isntRace = this.sessionType !== ESession.Race;
		if (isntRace) {
			const bestTime = r3e.data.SectorTimesBestSelf.Sector3;
			return bestTime !== INVALID
				? bestTime > 60
					? formatTime(Math.max(0, bestTime), 'm:ss.SSS')
					: formatTime(Math.max(0, bestTime), 's.SSS')
				: '-';
		}

		const lapTime = r3e.data.LapTimeCurrentSelf;
		return lapTime !== INVALID
			? lapTime > 60
				? formatTime(Math.max(0, lapTime), 'm:ss.SSS')
				: formatTime(Math.max(0, lapTime), 's.SSS')
			: '-';
	}

	private getFlagColor(): string {
		if (r3e.data.Flags.Yellow > 0) {
			return require('./../../img/yellow.png');
		}
		if (r3e.data.Flags.White > 0) {
			return require('./../../img/white.png');
		}
		if (r3e.data.Flags.Blue > 0) {
			return require('./../../img/blue.png');
		}
		if (r3e.data.Flags.Black > 0) {
			return require('./../../img/black.png');
		}
		if (r3e.data.Flags.Green > 0) {
			return require('./../../img/green.png');
		}
		if (r3e.data.Flags.Checkered > 0) {
			return require('./../../img/checkered.png');
		}
		if (r3e.data.Flags.BlackAndWhite > 0) {
			return require('./../../img/diagonal.png');
		}
		return require('./../../img/transparent.png');
	}

	render() {
		if (
			(
				this.sessionType === 2 &&
				this.sessionPhase === 1
			) || ((this.isLeaderboard || this.isHillClimb) && !showAllMode)
		) { return null; }
		if (this.notInRacePhase) {
			return null;
		}

		let sessionName = '';
		switch (this.sessionType) {
			case 0:
				sessionName = _('Practice');
				break;
			case 1:
				sessionName = _('Qualifying');
				break;
			case 2:
				sessionName = _('Race');
				break;
			case 3:
				sessionName = _('Warmup');
				break;
		}

		const showRD =
			(!this.singleplayerRace || showAllMode) &&
			this.props.settings.subSettings.showRanking.enabled;
		const timeUntilClosed = getTimeUntilPitClosed(this.maxLaps !== INVALID);
		const timeUntilPit = getTimeUntilPit(this.maxLaps !== INVALID);
		return (
			<div
				className={classNames(
					'tvTowerContainer',
					{
						shouldShow: !!this.drivers.length,
						longNamesCont: this.props.settings.subSettings.showLongNames.enabled,
						carLogosCont: this.props.settings.subSettings.showCarLogos.enabled,
						tireInfoCont: this.props.settings.subSettings.showTireInfo.enabled,
						multiClassCont: this.multiClass &&
							!this.props.settings.subSettings.showOwnClassOnly.enabled,
						showRankCont: showRD
					}
				)}
				{...widgetSettings(this.props)}
			>
				{this.sessionPhase !== INVALID && (
					<div
						className={classNames(
							style.tvTower,
							this.props.className
						)}
					>
						{times(0).map(
							(i) => {
								return (
									<div
										key={`empty-${i}`}
										className="player"
									/>
								);
							}
						)}
						{
							this.sessionTimeRemaining !== INVALID ||
							this.maxLaps !== INVALID
							?	<div>
									{
										this.props.settings.subSettings.showLogo.enabled && (
											<div
												className="header"
												style={{
													borderBottom: '1px solid white'
												}}
											>
												<img
													className="headerIcon"
													src={this.theLogoUrl === './../../img/logo.png'
														?	require('./../../img/logo.png')
														:	this.theLogoUrl
													}
												/>
											</div>
										)
									}
									{
										this.props.settings.subSettings.showSessionInfo.enabled && (
											(
												this.maxLaps === INVALID && (
													<div className="standingsSessionInfo">
														<div
															className="standingsSessionInfoText"
														>
															<span
																className="sessionNameText"
															>
																{sessionName.substr(0, 1)}
																	{`${' / '}`}
																<div className="sessionRemainHours">
																	{
																		formatTime(this.sessionTimeRemaining, 'H')
																	}
																</div>
																<div className="sessionRemainHoursText">
																	{`${'H'}`}
																</div>
																<div className="sessionRemainMinutes">
																	{formatTime(this.sessionTimeRemaining, 'mm')}
																</div>
																<div className="sessionRemainMinutesText">
																	{`${'M'}`}
																</div>
																<div className="sessionRemainSeconds">
																	{formatTime(this.sessionTimeRemaining, 'ss')}
																</div>
																<div className="sessionRemainSecondsText">
																	{`${'S'}`}
																</div>
															</span>
														</div>
														<img className="sessionFlags" src={this.getFlagColor()}/>
													</div>
												)
											) ||
											(
												this.maxLaps !== INVALID && (
													<div className="standingsSessionInfo">
														<div
															className="standingsSessionInfoText"
														>
															<span
																className="sessionNameText"
															>
																{sessionName.substr(0, 1)}
																{`${' / '}`}
																<div className="sessionRemainHours">
																	{_('Lap')}
																	{`${' '}`}
																	{this.currentLap}
																	{`${'/'}`}
																	{this.maxLaps}
																</div>
															</span>
														</div>
														<img className="sessionFlags" src={this.getFlagColor()}/>
													</div>
												)
											)
										)
									}
									{
										this.props.settings.subSettings.showPitWindow.enabled &&
										(
											showAllMode ||
											(
												this.mandatoryActive &&
												!this.mandatoryServed &&
												this.pitWindowStatus > 0 &&
												this.sessionPhase === 5 &&
												this.sessionType === ESession.Race &&
												(
													(
														this.pitWindowStatus === 1 &&
														isRange(timeUntilPit, 1, 3)
													) ||
													isRange(this.pitWindowStatus, 2, 3)
												)
											)
										)
										?
											<div
												className="mandatoryPitHeader"
												style={{
													background: showAllMode ||
													this.pitWindowStatus === 2
													?	timeUntilClosed > 3
														?	'rgba(100, 221, 23, 0.6)'
														:	'rgba(213, 0, 0, 0.6)'
													:	isRange(timeUntilPit, 1, 3)
														?	'rgba(213, 0, 249, 0.6)'
														:	this.pitWindowStatus === 3
															?	'rgba(0, 176, 255, 0.6)'
															:	'rgba(213, 0, 0, 0.6)'
												}}
											>
												{
													showAllMode || this.pitWindowStatus === 2
													?	timeUntilClosed > 3
														?	<div className="mandatoryPitHeaderText">
																{`${_('Pit-Window open for')} ${
																	timeUntilClosed
																} ${
																	this.maxLaps !== INVALID
																	?	getTimeUntilPitClosed(true) > 1
																		?	_('laps')
																		:	_('lap')
																	:	timeUntilClosed > 1
																		?	_('minutes')
																		:	_('minute')
																}`}
															</div>
														:	<div className="mandatoryPitHeaderText">
																{
																	getTimeUntilPitClosed(true) > 1
																	?
																		`${_('Pit-Window closes in')} ${
																			timeUntilClosed
																		} ${
																			this.maxLaps !== INVALID
																			?	_('laps')
																			:	_('minutes')
																		}`
																	:
																		`${_('Pit-Window closes')} ${
																			this.maxLaps !== INVALID
																			?	_('after this lap')
																			:	_('in 1 minute')
																		}`
																}
															</div>
													:	timeUntilClosed > 0 &&
														timeUntilPit < 1 &&
														this.pitWindowStatus === 3 &&
														!this.mandatoryServed
														?	<div className="mandatoryPitHeaderText">
																{_('Mandatory Pit In Progress')}
															</div>
														:	isRange(timeUntilPit, 2, 3)
															?	<div className="mandatoryPitHeaderText">
																	{`${_('Pit-Window opens in')} ${
																		timeUntilPit
																	} ${
																		this.maxLaps !== INVALID
																		?	timeUntilPit > 1
																			?	_('laps')
																			:	_('lap')
																		:	timeUntilPit > 1
																			?	_('minutes')
																			:	_('minute')
																	}`}
																</div>
															:	timeUntilPit === 1
																?	<div className="mandatoryPitHeaderText">
																		{`${_('Pit-Window opens')} ${
																			this.maxLaps !== INVALID
																			?	_('after this lap')
																			:	_('in 1 minute')
																		}`}
																	</div>
																:	timeUntilClosed === 1
																	?	<div className="mandatoryPitHeaderText">
																		{`${_('Pit-Window closes')} ${
																			this.maxLaps !== INVALID
																			?	_('this lap')
																			:	_('in 1 minute')
																		}`}
																		</div>
																	:	null
												}
											</div>
										:	null
									}
								</div>
							:	null
						}
						{
							this.drivers.map((player, i) => {
								return (
									<PositionEntry
										key={`${player.id}-${i}`}
										player={player}
										settings={this.props.settings}
										pitWindow={timeUntilPit}
										driverCount={this.playerCount}
										classPlayerCount={this.classDriverCount}
										isMulti={this.multiClass}
										playerPitInfo={eDriverPitInfo}
										playerLapInfo={eDriverLapInfo}
										playerDiffs={eDriverDiffs}
										showIncUntil={this.showIncUntil}
										playerSlotId={this.playerSlotId}
										singleplayerRace={this.singleplayerRace}
										position={this.position}
										positionClass={this.positionClass}
										sessionType={this.sessionType}
										sessionPhase={this.sessionPhase}
										incidentPoints={this.incidentPoints}
										maxIncidentPoints={this.maxIncidentPoints}
										classPerformanceIndex={this.classPerformanceIndex}
										isLeaderboard={this.isLeaderboard}
										isHillClimb={this.isHillClimb}
									/>
								);
							})
						}
					</div>
				)}

			</div>
		);
	}
}

interface IEntryProps extends React.HTMLAttributes<HTMLDivElement> {
	player: IDriverInfo;
	settings: IWidgetSetting;
	pitWindow: number;
	driverCount: number;
	classPlayerCount: number;
	isMulti: boolean;
	playerPitInfo: IDriverPitInfo;
	playerLapInfo: IDriverLapInfo;
	playerDiffs: IDriverDiffs;
	showIncUntil: number;
	playerSlotId: number;
	singleplayerRace: boolean;
	position: number;
	positionClass: number;
	sessionType: number;
	sessionPhase: number;
	incidentPoints: number;
	maxIncidentPoints: number;
	classPerformanceIndex: number;
	isLeaderboard: boolean;
	isHillClimb: boolean;
}

@observer
export class PositionEntry extends React.Component<IEntryProps, {}> {
	constructor(props: IEntryProps) {
		super(props);
	}
	private renderPlayerNameLong(name: string) {
		const firstInitial = name.substr(0, 1).toUpperCase() + '. ';
		const parts = name.split(' ');
		const lastNames = parts.slice(1);
		const retName = lastNames.map((item) => item.toUpperCase());
		return firstInitial + retName.toString().replace(',', ' ').substr(0, 3);
	}
	private renderPlayerNameShort(name: string) {
		const parts = name.split(' ');
		const lastNames = parts.slice(1);
		const retName = lastNames.map((item) => item.toUpperCase());
		return retName.toString().replace(',', ' ').substr(0, 3);
	}
	private getTyre(tyreChoice: number) {
		if (showAllMode) {
			return require('./../../img/hard.png');
		}
		if (tyreChoice === -1) {
			return require('./../../img/transparent.png');
		}
		if (tyreChoice === 0) {
			return require('./../../img/primary.png');
		}
		if (tyreChoice === 1) {
			return require('./../../img/alternate.png');
		}
		if (tyreChoice === 2) {
			return require('./../../img/soft.png');
		}
		if (tyreChoice === 3) {
			return require('./../../img/medium.png');
		}
		if (tyreChoice === 4) {
			return require('./../../img/hard.png');
		}
		return require('./../../img/transparent.png');
	}

	private hexToRGB(hex: string, alpha: number) {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);

		if (alpha > 0) {
			return `rgba(${
				r >= 0
				?	r
				:	0
			}, ${
				g >= 0
				?	g
				:	0
			}, ${
				b >= 0
				?	b
				:	0
			}, ${alpha}) 5px solid`;
		}
		return `rgba(${
			r >= 0
			?	r
			:	0
		}, ${
			g >= 0
			?	g
			:	0
		}, ${
			b >= 0
			?	b
			:	0
		}, ${alpha}) 5px solid`;
	}

	private getStartEnd(theEnd: boolean) {
		const classOnly =
			this.props.settings.subSettings.showOwnClassOnly.enabled;
		const driverPos =
			classOnly
			?	this.props.positionClass
			:	this.props.position;
		const driverCount =
			classOnly
			?	this.props.classPlayerCount
			:	this.props.driverCount;
		const start = driverPos <= 3
			?	4
			:	(driverCount - driverPos) >= 3
				?	driverPos > 5
					?	driverPos === 6
						?	driverPos - 2
						:	driverPos - 3
					:	4
				:	((driverPos - ((3 - (driverCount - driverPos)) + 3)));
		const end = start + 6;
		if (theEnd) {
			return end;
		}
		return start;
	}

	render() {
		const isLeaderboard = this.props.isLeaderboard;
		const isHillClimb = this.props.isHillClimb;
		const sessionType = this.props.sessionType;
		const sessionPhase = this.props.sessionPhase;
		const gameInReplay = r3e.data.GameInReplay > 0;
		if (
			(
				sessionType === 2 &&
				sessionPhase === 1
			) || ((isLeaderboard || isHillClimb) && !showAllMode)
		) { return null; }
		const player = this.props.player;
		const playerDiffs = this.props.playerDiffs;
		const playerPitInfo =
			(
				gameInReplay &&
				(
					(
						r3e.data.SessionTimeDuration !== -1 &&
						r3e.data.SessionTimeRemaining <= 0
					) ||
					(
						r3e.data.NumberOfLaps !== -1 &&
						r3e.data.CompletedLaps >= (r3e.data.NumberOfLaps * 0.9)
					)
				)
			)
			?	{}
			:	this.props.playerPitInfo;
		const playerLapInfo = this.props.playerLapInfo;
		const playerSlotId = this.props.playerSlotId;
		const classOnly =
			this.props.settings.subSettings.showOwnClassOnly.enabled;
		let showIt = false;

		let sessionName = '';
		switch (sessionType) {
			case 0:
				sessionName = _('Practice');
				break;
			case 1:
				sessionName = _('Qualifying');
				break;
			case 2:
				sessionName = _('Race');
				break;
			case 3:
				sessionName = _('Warmup');
				break;
		}

		const myIncidentPoints = this.props.incidentPoints !== undefined
			?	this.props.incidentPoints
			:	-1;
		const maxIncidentPoints = this.props.maxIncidentPoints !== undefined
			?	this.props.maxIncidentPoints
			:	-1;
		const showIncUntil = this.props.showIncUntil;

		const showIncPoints =
			this.props.settings.subSettings.showIncidentPoints.enabled &&
			maxIncidentPoints !== -1 &&
			sessionName !== 'Practice' &&
			sessionName !== 'Warmup' &&
			(
				player.id !== -1 &&
				player.id === playerSlotId
			) &&
			showIncUntil - nowCheck >= 0;
		const warnInc =
			showIncPoints &&
			myIncidentPoints >= (maxIncidentPoints * 0.9);
		const classPerformanceIndex = this.props.classPerformanceIndex;
		const position = this.props.position;
		const positionClass = this.props.positionClass;

		if (
			this.props.settings.subSettings.showFullGrid.enabled
		) {
			showIt = true;
		}
		if (
			(
				classOnly &&
				player.positionClass < 4
			) ||
			(
				!classOnly &&
				player.position < 4
			)
		) {
			showIt = true;
		}

		if (
			(
				!classOnly &&
				player.position <= this.getStartEnd(true) &&
				player.position >= this.getStartEnd(false)
			) ||
			(
				classOnly &&
				player.positionClass <= this.getStartEnd(true) &&
				player.positionClass >= this.getStartEnd(false)
			)
		) {
			showIt = true;
		}
		if (
			classOnly &&
			player.performanceIndex !== classPerformanceIndex
		) {
			showIt = false;
		}
		if (
			(
				!this.props.settings.subSettings.showStoppedCars.enabled ||
				!this.props.settings.subSettings.showFullGrid.enabled
			) &&
			player.finishStatus > 1
		) {
			showIt = false;
		}
		// const borderColor = this.hexToRGB(player.classColor, 0.8);
		const singleplayerRace = this.props.singleplayerRace;
		const showRD =
			(showAllMode || !singleplayerRace) &&
			this.props.settings.subSettings.showRanking.enabled;

		return (
			showIt
			?	(
				<div
					className={classNames('player', {
						isUser: player.isUser,
						lapping: player.lapDiff < 0,
						sameLap: player.lapDiff === 0,
						lapped: player.lapDiff > 0
					})}
				>
					{
						showIt && (
							<div
								className="position"
							>
								{player.positionClass}
							</div>
						)
					}
					{
						showIt && (
							<div className="name">
								{
									this.props.settings.subSettings.showLongNames.enabled
									?	player.shortName
									// ?	this.renderPlayerNameLong(player.name)
									:	this.renderPlayerNameShort(player.name)
								}
							</div>
						)
					}
					{
						showIt &&
						showRD && (
							<div
								className="rankData"
								style={{
									background: eRankInvert
										?	undefined
										:	'rgba(255, 255, 255, 1)',
									color: eRankInvert
										?	undefined
										:	'rgba(0, 0, 0, 1)',
									fontWeight: eRankInvert
										?	undefined
										:	'bold'
								}}
							>
								{
									`${
										showAllMode
										?	2.22
										:	player.rankingData.Rating.toFixed(1)
									} / ${
										showAllMode
										?	94.6
										:	player.rankingData.Reputation.toFixed(1)
									}`
								}
							</div>
						)
					}
					{
						showIt && (
							(
								this.props.settings.subSettings.showCarLogos.enabled && (
									<div className="manufacturerIcon">
										<img
											src={player.logoUrl}
										/>
									</div>
								)
							)
						)
					}
					{
						showIt && (
							(
								this.props.settings.subSettings.showTireInfo.enabled && (
									<div className="tyreChoiceContainer">
										<img
											className="tyreChoice"
											src={this.getTyre(player.tyreChoice)}
										/>
									</div>
								)
							)
						)
					}
					{
						showIt && (
							<div
								className={classNames(
									'diff'
								)}
								style={{
									color: this.props.settings.subSettings.showLastLaps.enabled &&
										playerLapInfo[player.id] !== undefined &&
										nowCheck <= playerLapInfo[player.id][2] &&
										!(
											(
												sessionType === 2 &&
												player.lapsDone < 1
											) || (
												sessionType !== 2 &&
												player.bestLapTime < 0
											)
										)
										?	`rgba(${
												playerLapInfo[player.id][3]
											}, ${
												playerLapInfo[player.id][4]
											}, ${
												playerLapInfo[player.id][5]
											}, 1)`
										:	warnInc &&
											showIncPoints
											?	'rgba(255, 0, 0, 1)'
											:	'rgba(255, 255, 255, 1)'
								}}
							>
								{
									showIncPoints
									?	maxIncidentPoints > 0
										?	`${myIncidentPoints}/${maxIncidentPoints}`
										:	myIncidentPoints
									:	`${
											this.props.settings.subSettings.showLastLaps.enabled &&
											playerLapInfo[player.id] !== undefined &&
											nowCheck <= playerLapInfo[player.id][2] &&
											!(
												(
													sessionType === 2 &&
													player.lapsDone < 1
												) || (
													sessionType !== 2 &&
													player.bestLapTime < 0
												)
											)
											?	playerLapInfo[player.id][1] !== -999
												?	playerLapInfo[player.id][1] >= 60
													?	formatTime(
															playerLapInfo[player.id][1],
															'm:ss.SSS'
														)
													:	formatTime(
															playerLapInfo[player.id][1],
															'ss.SSS'
														)
												:	'INVALID'
											:	player.diff.toString().indexOf('.') <= -1 ||
												sessionType !== ESession.Race
												?	player.diff
												:	playerDiffs[player.id] !== undefined
													?	player.position < position &&
														playerDiffs[player.id][1][0] > 0
														?	fancyTimeFormatGap(
																(
																	0 -
																	(
																		(
																			playerDiffs[player.id][0][0] /
																			2
																		) +
																		(
																			(
																				playerDiffs[player.id][0][0] /
																				2
																			) -
																			playerDiffs[player.id][1][0]
																		)
																	)
																), 1, 0
															)
														:	player.position > position &&
															playerDiffs[player.id][1][0] < 0
															?	fancyTimeFormatGap(
																	(
																		(
																			playerDiffs[player.id][0][0] /
																			2
																		) +
																		(
																			(
																				playerDiffs[player.id][0][0] /
																				2
																			) +
																			playerDiffs[player.id][1][0]
																		)
																	), 1, 0
																)
															:	fancyTimeFormatGap(playerDiffs[player.id][1][0], 1, 0)
													:	'-'
										}`
								}
							</div>
						)
					}
					{
						showIt && (
							(
								player.finishStatus > 0 ||
								(
									sessionType !== ESession.Race &&
									player.pitting &&
									sessionPhase === 6
								)
								?	player.finishStatus === 1 ||
									(
										sessionType !== ESession.Race &&
										player.pitting &&
										sessionPhase === 6
									)
									?	<div
											className={classNames(
												'pitting',
												{
													noShadow: true
												}
											)}
									>
										<img className="cheqFlag" src={require('./../../img/checkered.png')}/>
									</div>
									:	<div
											className={classNames(
												'pitting',
												{
													noShadow: false
												}
											)}
											style={{
												background: 'rgba(0, 0, 0, 0.6)',
												color: '#fff',
												width: '25px'
											}}
									>
										{
											player.finishStatusText
										}
									</div>
								:	this.props.settings.subSettings.showPitStatus.enabled
									?	player.pitting > 0 || showAllMode
										?	this.props.settings.subSettings.showPitTime.enabled &&
											(
												showAllMode ||
												(
													playerPitInfo[player.id] !== undefined &&
													sessionType === ESession.Race &&
													playerPitInfo[player.id][2] >= 0
												)
											)
											?	<div
												className={classNames(
													'pitting',
													{
														noShadow: false
													}
												)}
												style={{
													background: showAllMode ||
													playerPitInfo[player.id][3] > 0
													?	showAllMode || playerPitInfo[player.id][4] > 0
														?	'rgba(100, 221, 23, 0.8)'
														:	'rgba(255, 70, 0, 0.8)'
													:	'rgba(0, 176, 255, 0.8)',
													color: '#fff',
													width: '25px'
												}}
											>
												{`${'PIT'}`}
												<div
													className={classNames(
														'pittime',
														{
															noShadow: false
														}
													)}
													style={{
														marginLeft: '3px'
													}}
												>
													{
														`${
															showAllMode
															?	52.9
															:	(
																	(
																		nowCheck - playerPitInfo[player.id][2]
																	) / 1000
																).toFixed(1)
														}`
													}
												</div>
												<div
													className={classNames(
														'pittimea',
														{
															noShadow: showAllMode
															?	false
															:	playerPitInfo[player.id][3] <= 0
														}
													)}
													style={{
														color: showAllMode || playerPitInfo[player.id][3] > 0
														?	showAllMode || playerPitInfo[player.id][4] > 0
															?	'rgba(100, 221, 23, 1)'
															:	'rgba(255, 255, 255, 1)'
														:	'rgba(255, 255, 255, 0)',

														background: showAllMode || playerPitInfo[player.id][3] > 0
														?	'rgba(0, 100, 255, 0.8)'
														:	'rgba(0, 100, 255, 0)'
													}}
												>
													{
														showAllMode || playerPitInfo[player.id][3] > 0
														?	showAllMode || playerPitInfo[player.id][4] <= 0
															?	`${
																	showAllMode
																	?	13.5
																	:	(
																			(
																				nowCheck - playerPitInfo[player.id][3]
																			) / 1000
																		).toFixed(1)
																}`
															:	`${
																	(
																		(
																			playerPitInfo[player.id][4] - playerPitInfo[player.id][3]
																		) / 1000
																	).toFixed(1)
																}`
														:	'|'
													}
												</div>
											</div>

											:	<div
												className={classNames(
													'pitting',
													{
														noShadow: false
													}
												)}
												style={{
													background: 'rgba(0, 176, 255, 0.8)',
													color: '#fff',
													width: '25px'
												}}
											>
												{`${'PIT'}`}
											</div>
										:	sessionType === ESession.Race &&
											(player.mandatoryPit !== -1 || (gameInReplay && sessionType === ESession.Race))
											?
												this.props.settings.subSettings.showPitTime.enabled &&
												sessionType === ESession.Race &&
												playerPitInfo[player.id] !== undefined &&
												playerPitInfo[player.id][5] > 0 &&
												(
													(
														nowCheck - playerPitInfo[player.id][5] <= 7500 &&
														this.props.settings.subSettings.autoHidePitTime.enabled
													) ||
													!this.props.settings.subSettings.autoHidePitTime.enabled
												)
												?	player.numPitstops > 1
													?	<div
														className={classNames(
															'pitting',
															{
																noShadow: false
															}
														)}
														style={{
															background: player.numPitstops > 0 &&
																player.mandatoryPit === 2
																?	'rgba(100, 221, 23, 0.8)'
																:	'rgba(255, 70, 0, 0.8)',
															color: 'rgba(255, 255, 255, 1)',
															width: '25px'
														}}
													>
														{
															player.numPitstops
														}
														<div
															className={classNames(
																'pittime',
																{
																	noShadow: false
																}
															)}
															style={{
																marginLeft: '3px'
															}}
														>
															{
																`${
																		(
																			(
																				playerPitInfo[player.id][5] - playerPitInfo[player.id][2]
																			) / 1000
																		).toFixed(1)
																	}`
															}
														</div>
														<div
															className={classNames(
																'pittimea',
																{
																	noShadow: playerPitInfo[player.id][4] <= 0
																}
															)}
															style={{
																marginLeft: '0px',
																color: playerPitInfo[player.id][4] > 0
																?	'rgba(100, 221, 23, 1)'
																:	'rgba(100, 221, 23, 0)',
																background: playerPitInfo[player.id][4] > 0
																?	'rgba(0, 100, 255, 0.8)'
																:	'rgba(0, 100, 255, 0)'
															}}
														>
															{
																playerPitInfo[player.id][4] > 0
																?	`${
																		(
																			(
																				playerPitInfo[player.id][4] - playerPitInfo[player.id][3]
																			) / 1000
																		).toFixed(1)
																	}`
																:	'|'
															}
														</div>
													</div>
													:	<div
														className={classNames(
															'pitting',
															{
																noShadow: true
															}
														)}
														style={{
															background: player.numPitstops > 0 &&
																player.mandatoryPit === 2
																?	'rgba(100, 221, 23, 0.8)'
																:	this.props.pitWindow <= 0
																	?	'rgba(255, 0, 0, 0.8)'
																	:	'rgba(213, 0, 0, 0)',
															color: player.numPitstops > 0 &&
																player.mandatoryPit === 2
																?	'rgba(100, 221, 23, 0)'
																:	'rgba(213, 0, 0, 0)',
															width: '5px'
														}}
													>
														{
															'|'
														}
														<div
															className={classNames(
																'pittime',
																{
																	noShadow: false
																}
															)}
															style={{
																marginLeft: '21px'
															}}
														>
															{
																`${
																		(
																			(
																				playerPitInfo[player.id][5] - playerPitInfo[player.id][2]
																			) / 1000
																		).toFixed(1)
																	}`
															}
														</div>
														<div
															className={classNames(
																'pittimea',
																{
																	noShadow: playerPitInfo[player.id][4] <= 0
																}
															)}
															style={{
																marginLeft: '0px',
																color: playerPitInfo[player.id][4] > 0
																?	'rgba(100, 221, 23, 1)'
																:	'rgba(100, 221, 23, 0)',
																background: playerPitInfo[player.id][4] > 0
																?	'rgba(0, 100, 255, 0.8)'
																:	'rgba(0, 100, 255, 0)'
															}}
														>
															{
																playerPitInfo[player.id][4] > 0
																?	`${
																		(
																			(
																				playerPitInfo[player.id][4] - playerPitInfo[player.id][3]
																			) / 1000
																		).toFixed(1)
																	}`
																:	'|'
															}
														</div>
													</div>

												:	player.numPitstops > 1
													?	<div
														className={classNames(
															'pitting',
															{
																noShadow: false
															}
														)}
														style={{
															background: player.mandatoryPit === 2
															?	'rgba(100, 221, 23, 0.8)'
															:	'rgba(255, 70, 0, 0.8)',
															color: 'rgba(255, 255, 255, 1)',
															width: '25px'
														}}
													>
														{
															player.numPitstops
														}
													</div>
													:	<div
														className={classNames(
															'pitting',
															{
																noShadow: true
															}
														)}
														style={{
															background: player.numPitstops > 0 &&
																player.mandatoryPit === 2
																?	'rgba(100, 221, 23, 0.8)'
																:	this.props.pitWindow <= 0
																	?	'rgba(255, 70, 0, 0.8)'
																	:	'rgba(213, 0, 0, 0)',
															color: player.numPitstops > 0 &&
																player.mandatoryPit === 2
																?	'rgba(100, 221, 23, 0)'
																:	'rgba(255, 70, 0, 0)',
															width: '5px'
														}}
													>
														{
															'|'
														}
													</div>
											:	sessionType === ESession.Race &&
												player.numPitstops > 0
												?	this.props.settings.subSettings.showPitTime.enabled &&
													playerPitInfo[player.id] !== undefined &&
													playerPitInfo[player.id][5] > 0 &&
													(
														(
															nowCheck - playerPitInfo[player.id][5] <= 7500 &&
															this.props.settings.subSettings.autoHidePitTime.enabled
														) ||
														!this.props.settings.subSettings.autoHidePitTime.enabled
													)
													?	<div
														className={classNames(
															'pitting',
															{
																noShadow: false
															}
														)}
														style={{
															background: 'rgba(100, 221, 23, 0.8)',
															color: 'rgba(255, 255, 255, 1)',
															width: '25px'
														}}
													>
														{
															player.numPitstops
														}
														<div
															className={classNames(
																'pittime',
																{
																	noShadow: false
																}
															)}
															style={{
																marginLeft: '3px'
															}}
														>
															{
																`${
																		(
																			(
																				playerPitInfo[player.id][5] - playerPitInfo[player.id][2]
																			) / 1000
																		).toFixed(1)
																	}`
															}
														</div>
														<div
															className={classNames(
																'pittimea',
																{
																	noShadow: playerPitInfo[player.id][4] <= 0
																}
															)}
															style={{
																color: playerPitInfo[player.id][4] > 0
																?	'rgba(100, 221, 23, 1)'
																:	'rgba(100, 221, 23, 0)',
																background: playerPitInfo[player.id][4] > 0
																?	'rgba(0, 100, 255, 0.8)'
																:	'rgba(0, 100, 255, 0)'
															}}
														>
															{
																playerPitInfo[player.id][4] > 0
																?	`${
																		(
																			(
																				playerPitInfo[player.id][4] - playerPitInfo[player.id][3]
																			) / 1000
																		).toFixed(1)
																	}`
																:	'|'
															}
														</div>
													</div>
													:	<div
														className={classNames(
															'pitting',
															{
																noShadow: false
															}
														)}
														style={{
															background: 'rgba(100, 221, 23, 0.8)',
															color: 'rgba(255, 255, 255, 1)',
															width: '25px'
														}}
													>
														{
															player.numPitstops
														}
													</div>
												:	null
													/* <div
														className={classNames(
															'pitting',
															{
																noShadow: true
															}
														)}
														style={{
															background: 'rgba(100, 221, 23, 0.8)',
															color: 'rgba(100, 221, 23, 0)',
															width: '5px'
														}}
													>
														{
															'|'
														}
													</div> */
									:	null
							)
						)
					}
					{
						showIt &&
						!classOnly &&
						this.props.isMulti && (
							<div
								className="classStyle"
								style={{
									borderLeft: `7px solid ${player.classColor}`
								}}
							/>
						)
					}
					{
						showIt &&
						sessionType === ESession.Race && (
							<div
								className="bestLap"
								style={{
									borderLeft: player.bestLapTime !== -1
										?	player.bestLapTimeLeader === player.bestLapTime
											?	'rgba(213, 0, 249, 0.8) 5px solid'
											:	player.bestLapTime === player.bestLapTimeClass
												?	`${player.classColor} 5px solid`
												:	'rgba(0, 0, 0, 0) 5px solid'
										:	'rgba(0, 0, 0, 0) 5px solid'
								}}
							/>
						)
					}
					{
						showIt && (
							(
								player.finishStatus > 1
								?	<div className="notFinishBlock">
									{
										'|'
									}
								</div>
								:	null
							)
						)
					}
				</div>
				)
			:
				!this.props.settings.subSettings.showFullGrid.enabled &&
				(
					(
						classOnly &&
						player.performanceIndex === classPerformanceIndex &&
						positionClass > 6 &&
						player.positionClass === 4
					) ||
					(
						!classOnly &&
						position > 6 &&
						player.position === 4
					)
				)
				?	(
					<div className="podiumSeparator">
						{
							'|'
						}
					</div>
					)
				:	null
		);
	}
}

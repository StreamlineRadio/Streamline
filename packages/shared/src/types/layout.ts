export interface ModuleInstanceRecord {
	id: string;
	layoutId: string;
	moduleId: string;
	title: string;
	x: number;
	y: number;
	width: number;
	height: number;
	zIndex: number;
	minimized: boolean;
	settingsJson: string;
}

export interface Layout {
	id: string;
	name: string;
	isActive: boolean;
	createdAt: number;
	updatedAt: number;
	instances: ModuleInstanceRecord[];
}

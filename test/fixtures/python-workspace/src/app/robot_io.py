class RobotClient:
    def __init__(self, robot_name: str) -> None:
        self.robot_name = robot_name

    def home_pose(self) -> str:
        return f"{self.robot_name}:home"

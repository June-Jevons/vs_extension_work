from app.config import load_config
from app.robot_io import RobotClient
from app.motion.planner import plan_motion


def run() -> list[str]:
    config = load_config()
    robot = RobotClient(config["robot"])
    return plan_motion(robot.home_pose())


if __name__ == "__main__":
    run()

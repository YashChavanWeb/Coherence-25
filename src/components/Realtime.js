import React, { useState, useEffect } from "react";
import { getDatabase, ref, onValue } from "firebase/database"; 
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "../firebase"; 


const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const Realtime = () => {
   
    const initialTime = 24 * 60 * 60;
    const [timeLeft, setTimeLeft] = useState(initialTime);
    const [tasks, setTasks] = useState([ 
        { title: "Previous Task", time: "10:00 AM" },
        { title: "Current Task", time: "12:00 PM" },
        { title: "Next Task", time: "2:00 PM" }
    ]);
    const initialTime = 24 * 60 * 60; // Initial 24-hour countdown in seconds
    const [timeLeft, setTimeLeft] = useState(initialTime);

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTask, setCurrentTask] = useState(null);
    const [previousTask, setPreviousTask] = useState(null);
    const [nextTask, setNextTask] = useState(null);


    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secondsLeft = seconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secondsLeft).padStart(2, '0')}`;
    };


    // Convert time to 24-hour format for comparison
    const convertTo24HourFormat = (time) => {
        const [timeString, period] = time.split(' ');
        let [hours, minutes] = timeString.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes; // Return total minutes
    };

    useEffect(() => {
        // Request notification permission when the component mounts
        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }

        // Fetch tasks from Firebase when the component mounts
        const tasksRef = ref(db, 'tasks');
        const unsubscribe = onValue(tasksRef, (snapshot) => {
            const data = snapshot.val();
            const fetchedTasks = data ? Object.keys(data).map((key) => ({
                id: key,
                title: data[key].title,
                time: data[key].time,
                order: data[key].order,
            })) : [];

            // Sort tasks by order field
            fetchedTasks.sort((a, b) => a.order - b.order);
            setTasks(fetchedTasks);
            setLoading(false);

            // Get the target time (e.g., "1:40 PM")
            const targetTime = convertTo24HourFormat('1:35 PM');
            let matchedTask = null;
            let currentTaskIndex = -1;

            // Iterate through the tasks and find the current, previous, and next tasks
            for (let i = 0; i < fetchedTasks.length; i++) {
                const taskTime = convertTo24HourFormat(fetchedTasks[i].time);

                if (taskTime === targetTime) {
                    matchedTask = fetchedTasks[i];
                    currentTaskIndex = i;
                    break;
                }

                if (i > 0) {
                    const prevTaskTime = convertTo24HourFormat(fetchedTasks[i - 1].time);
                    const nextTaskTime = convertTo24HourFormat(fetchedTasks[i].time);

                    // If target time is between previous and next tasks
                    if (targetTime >= prevTaskTime && targetTime < nextTaskTime) {
                        currentTaskIndex = i;
                        break;
                    }
                }
            }

            // Set the previous, current, and next tasks based on the index found
            if (currentTaskIndex !== -1) {
                setCurrentTask(fetchedTasks[currentTaskIndex]);
                setPreviousTask(fetchedTasks[currentTaskIndex - 1] || null); // Previous task
                setNextTask(fetchedTasks[currentTaskIndex + 1] || null); // Next task

                // Show a notification for the current task
                if (Notification.permission === 'granted') {
                    new Notification("Current Task", {
                        body: `${fetchedTasks[currentTaskIndex].title} at ${fetchedTasks[currentTaskIndex].time}`,
                        icon: "icon_url_here", // You can replace this with an actual URL for the icon
                    });
                }
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (timeLeft === 0) return;

        const interval = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000); 

        return () => clearInterval(interval);
    }, [timeLeft]);

   
    useEffect(() => {
        const tasksRef = ref(db, 'tasks');
        onValue(tasksRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedTasks = Object.keys(data).map(key => ({
                    id: key,
                    title: data[key].title,
                    time: data[key].time
                }));
                setTasks(loadedTasks);
            }
        });
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-screen text-white">
            <h1 className="text-6xl">LIVE</h1>
            <div className="text-9xl mb-8 border-b-2 w-3/4 rounded-3xl p-12 border-blue-500 shadow-lg shadow-blue-500">
                {formatTime(timeLeft)} {/* Display countdown */}
            </div>

            <div className="flex justify-center items-center w-[80%] space-x-12 m-4 mb-6">
                {/* Previous task */}
                <div className="flex-none text-center p-8 rounded-3xl text-xl border-2 opacity-50 w-1/4 shadow-lg shadow-gray-400">
                    <h2>{tasks[0]?.title}</h2>
                    <p>{tasks[0]?.time}</p>

                {formatTime(timeLeft)}
            </div>

            {/* Display loading spinner while fetching tasks */}
            {loading ? (
                <div className="flex justify-center items-center w-full h-24">
                    <div className="spinner-border animate-spin border-4 border-blue-500 border-t-transparent rounded-full w-16 h-16"></div>

                </div>
            ) : (
                <div className="flex justify-center items-center w-[80%] space-x-12 m-4 mb-6">
                    {/* Previous task */}
                    <div className="flex-none text-center p-8 rounded-3xl text-xl border-2 opacity-50 w-1/4 shadow-lg shadow-gray-400">
                        {previousTask ? (
                            <>
                                <h2>{previousTask.title}</h2>
                                <p>{previousTask.time}</p>
                            </>
                        ) : (
                            <p>No previous task</p>
                        )}
                    </div>


                {/* Current task in the center */}
                <div className="flex-grow text-center p-8 rounded-3xl text-3xl font-bold border-2 border-blue-500 shadow-lg shadow-blue-500 hover:scale-105 transition-all ease-in-out duration-0.3">
                    <h2>{tasks[1]?.title}</h2>
                    <p>{tasks[1]?.time}</p>
                </div>

                {/* Next task */}
                <div className="flex-none text-center p-8 rounded-3xl text-xl border-2 w-1/4 border-blue-700 shadow-lg shadow-blue-700 hover:scale-105 transition-all ease-in-out duration-0.3">
                    <h2>{tasks[2]?.title}</h2>
                    <p>{tasks[2]?.time}</p>

                    {/* Current task in the center */}
                    {currentTask && (
                        <div className="flex-grow text-center p-8 rounded-3xl text-3xl font-bold border-2 border-blue-500 shadow-lg shadow-blue-500 hover:scale-105 transition-all ease-in-out duration-0.3">
                            <h2>{currentTask.title}</h2>
                            <p>{currentTask.time}</p>
                        </div>
                    )}

                    {/* Next task */}
                    <div className="flex-none text-center p-8 rounded-3xl text-xl border-2 w-1/4 border-blue-700 shadow-lg shadow-blue-700 hover:scale-105 transition-all ease-in-out duration-0.3">
                        {nextTask ? (
                            <>
                                <h2>{nextTask.title}</h2>
                                <p>{nextTask.time}</p>
                            </>
                        ) : (
                            <p>No next task</p>
                        )}
                    </div>

                </div>
            )}

            <button className="border-2 p-3 m-2 rounded-3xl border-blue-500 hover:scale-105 transition-all ease-in-out duration-0.3">
                Show Timeline
            </button>
        </div>
    );
};

export default Realtime;

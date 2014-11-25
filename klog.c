/*
 * This is a sample use of the klogctl kernel function (there is another klogctl else there in glibc, which does something completely different)
 * This program gets the size of the available kernel messages, put it in a buffer with the right size, empty the kernel messages, and show messages to stdout*/
//#ifndef _GNU_SOURCE
//# define _GNU_SOURCE
//#endif
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <sys/un.h>
#include <fcntl.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <unistd.h>
#include <assert.h>
#include <errno.h>
#include <sys/klog.h>
#include <dlfcn.h>
#include <ctype.h>

#define SYSLOG_NAMES
# include <syslog.h>
#undef SYSLOG_NAMES

#define LINE_MAX 524288
#define MAX_PIDS 32768



int pid_count = 0;
int count = 0;

int interval = 0;                           /* interval at which to display results*/


struct pid{
    int pid;
    //int op;//READ = 0, WRITE = 1;
    char cmd[50];
    char dev[50];
    //char proc[100];
    int rblk;
    int wblk;
    //int sectors;
};

struct pid diskio[MAX_PIDS];

void build_io(struct pid my_pid);

void printResult();

void catchAlarm(int sig);

static void strip_unprintable(char *str)
{
	do if (!*str) return;
	while (isprint(*str++));
	char *dst;
	for (dst = str; *str; str++)
		if (isprint(*str)) *dst++ = *str;
	*dst = '\0';
}

static void handle_line(char *line)
{
	/* <38>Oct  9 22:15:01 CRON[7918]: (pam_unix) session opened for user root by (uid=0)
	 */
        //int op;//READ = 0, WRITE = 1;
        
        struct pid my_pid;
        
	char *endp;
        
	int logcode = strtoul(line+1, &endp, 10);

	if (line[0] != '<' && *endp != '>') {
		printf("GOT garbage: %s\n", line);
		return;
	}
	line = endp+1;

	int facility = LOG_FAC(logcode);

	/* strip timestamp. */
	if (facility != LOG_KERN && line[3] == ' ' && line[9] == ':')
		line += 16;

	strip_unprintable(line);
        
        //fprintf(stdout,"%s\n",line);
        
        //printf("%s\n",strstr(line,"WRITE"));
        
        if(strstr(line,"WRITE") != NULL){
            
            //op = 1;
            //printf("%s\n",line);
            //printf("Process name: %s\n",line);
            //printf("PID: %s\n",line);
            //printf("Device: %s\n",line);
            
            int len = strlen(line);
            char cmd[len];cmd[0] = '\0'; 
            
            char pid[len];pid[0] = '\0';
            
            char dev[len];dev[0] = '\0';
            
            //char proc[len];proc[0] = '\0';
            char sectors[len];sectors[0] = '\0';
            
            
            //strncat(proc,line,strcspn(line,"("));
            //printf("PROC: %s\n",proc);
            const char *startcmd = line;
            strncat(cmd,startcmd,strcspn(startcmd,"("));
            
            
            const char *startpid = strchr(line,'(')+1;
            strncat(pid,startpid,strcspn(startpid,")"));
            //printf("PID: %s\n",pid);
            
            //const char *startdev = strrchr(line,' ')+1;
            //strncat(dev,startdev,len);
            
            const char *startdev = strstr(line," on ")+4;
            strncat(dev,startdev,strlen(startdev)-strlen(strrchr(startdev,'(')-1));
            //printf("DEV: %s\n",dev);
            
            
            const char *startsec = strrchr(line,'(')+1;
            strncat(sectors,startsec,strcspn(startsec," "));
            
            
            //printf("SECTORS: %s\n",sectors);
            
            //struct pid{
            //    int pid;
            //    //int op;//READ = 0, WRITE = 1;
            //    char dev[10];
            //    char proc[100];
            //    int rblk;
            //    int wblk;
            //};
            my_pid.pid = atoi(pid);
            strcpy(my_pid.cmd,cmd);
            strcpy(my_pid.dev,dev);
            //strcpy(my_pid.proc,proc);
            my_pid.wblk = atoi(sectors);
            my_pid.rblk = 0;
            //my_pid.sectors = atoi(sectors);
            build_io(my_pid);
        }
        
        if(strstr(line,"READ") != NULL){
            
            //op = 1;
            //printf("%s\n",line);
            //printf("Process name: %s\n",line);
            //printf("PID: %s\n",line);
            //printf("Device: %s\n",line);
            
            int len = strlen(line);
            char cmd[len];cmd[0] = '\0'; 
            char pid[len];pid[0] = '\0';
            char dev[len];dev[0] = '\0';
            //char proc[len];proc[0] = '\0';
            char sectors[len];sectors[0] = '\0';
            
            
            //strncat(proc,line,strcspn(line,"("));
            //printf("PROC: %s\n",proc);
            
            const char *startcmd = line;
            strncat(cmd,startcmd,strcspn(startcmd,"("));
            
            const char *startpid = strchr(line,'(')+1;
            strncat(pid,startpid,strcspn(startpid,")"));
            //printf("PID: %s\n",pid);
            
            //const char *startdev = strrchr(line,' ')+1;
            //strncat(dev,startdev,len);
            
            const char *startdev = strstr(line," on ")+4;
            strncat(dev,startdev,strlen(startdev)-strlen(strrchr(startdev,'(')-1));
            
            const char *startsec = strrchr(line,'(')+1;
            strncat(sectors,startsec,strcspn(startsec," "));
            //printf("DEV: %s\n",dev);
            
            //struct pid{
            //    int pid;
            //    //int op;//READ = 0, WRITE = 1;
            //    char dev[10];
            //    char proc[100];
            //    int rblk;
            //    int wblk;
            //};
            my_pid.pid = atoi(pid);
            strcpy(my_pid.cmd,cmd);
            strcpy(my_pid.dev,dev);
            //strcpy(my_pid.proc,proc);
            my_pid.wblk = 0;
            my_pid.rblk = atoi(sectors);
            //my_pid.sectors = atoi(sectors);
            build_io(my_pid);
        }
        
        
        
        
        //pid_count++;
        //if(pid_count >= 10 || count >=1000){
        //    printf("PID Count %d, Count %d, exiting...\n",pid_count,count);
        //    printResult();
        //    exit(0);
        //}
        //count++;
	//if (lua_machine)
	//	handle_processed_line(logcode, line);

	/* spread the word to all listening clients */
	//line -= 2;
	//*(int16_t *)line = logcode;
	//broadcast(line, clients);
}

void build_io(struct pid my_pid){
    int i;
    int z;
    int devlen = strlen(my_pid.dev);
    //int proclen = strlen(my_pid.proc);
    
    if (pid_count >= MAX_PIDS){
        printf("%d pids reached, clearing results...\n",MAX_PIDS);
        //printResult();
    }
    
    //Create first PID:
    if(pid_count == 0){
        
        diskio[0].pid = my_pid.pid;
        
        diskio[0].wblk = my_pid.wblk;
        diskio[0].rblk = my_pid.rblk;
        //diskio[0].sectors = my_pid.sectors;
        
        strcpy(diskio[0].dev,my_pid.dev);
        
        strcpy(diskio[0].cmd,my_pid.cmd);
        //strcpy(diskio[0].proc,my_pid.proc);
        

        pid_count++;
        return;
    }
    
    for(i = 0; i <= pid_count; i++) {//If this pid already being recorded:
        
        if(diskio[i].pid == my_pid.pid &&
           strcmp(diskio[i].dev,my_pid.dev) == 0){
                
                diskio[i].wblk = diskio[i].wblk + my_pid.wblk;
                diskio[i].rblk = diskio[i].rblk + my_pid.rblk;
                
                strcpy(diskio[i].cmd,my_pid.cmd);

                return;
            
        }
    }
    
    //New PID:
    diskio[pid_count].pid = my_pid.pid;
        
    diskio[pid_count].wblk = my_pid.wblk;
    diskio[pid_count].rblk = my_pid.rblk;
    
    strcpy(diskio[pid_count].dev,my_pid.dev);
    
    strcpy(diskio[pid_count].cmd,my_pid.cmd);
    //strcpy(diskio[pid_count].proc,my_pid.proc);
    

    pid_count++;
    return;
    
    
};

void printResult(){
    int i = 0;
    fprintf(stdout,"###BEGIN###\n");
    for(i = 0; i < pid_count; i++) {
        //printf("Result: Source MAC %s, Source %s, Source Port %d, ",ether_ntoa((struct ether_addr*)sockets[i].smac),inet_ntoa(sockets[i].sip),sockets[i].sport);
        //printf("Dest MAC %s, Dest %s, Dest Port %d, Length %d\n",ether_ntoa((struct ether_addr*)sockets[i].dmac),inet_ntoa(sockets[i].dip),sockets[i].dport,sockets[i].length);
        
        //fprintf(stdout,"PID: %d, Proc: %s, DEV: %s, Writes: %d, Reads: %d\n",diskio[i].pid,diskio[i].proc,diskio[i].dev,diskio[i].wblk,diskio[i].rblk);
        
        fprintf(stdout,"%d,%s,%s,%d,%d\n",diskio[i].pid,diskio[i].dev,diskio[i].cmd,diskio[i].rblk,diskio[i].wblk);
        
        //clear results:
        //sockets[i].sip.s_addr = NULL;
        //sockets[i].dip.s_addr = NULL;
        //sockets[i].sport = NULL;
        //sockets[i].dport = NULL;
        //sockets[i].length = NULL;
    }
    //clear results:
    pid_count=0;
    fprintf(stdout,"###END###\n");
    fflush(stdout);
}


static void readlines_klog()
{
	int all=klogctl(10, NULL,0);
        //KLOG Total buffer size: 524288
        static char buf[LINE_MAX] = "";
	char *nl;
	char *p;
	int unhandled, ret;
        
        //printf("KLOG Total buffer size: %d\n",all);
        
	unhandled = strlen(buf);
        //printf("Unhandled: %d\n",unhandled);
        
	ret = klogctl(3, buf+unhandled, LINE_MAX-unhandled);
        
        
        //Clear the buffer (set the flag):
        klogctl(5, NULL,0);
        
	if (ret < 0) {
		if (errno != EINTR)
			perror("klogctl");
		return;
	}
	if (ret == 0) {
		//puts("klogctl_eof");
		return;
	}
	unhandled += ret;

	p = buf;
	while ((nl = memchr(p, '\n', unhandled))) {
		*nl = '\0';
		handle_line(p);
		unhandled -= nl+1-p;
		assert(unhandled >= 0 && unhandled <= LINE_MAX);
		p = nl+1;
	}
	assert(unhandled >= 0 && unhandled <= LINE_MAX);
	if (unhandled == LINE_MAX) {
		puts("too long line");
		buf[0] = '\0';
		return;
	}
	memmove(buf, p, unhandled);
	buf[unhandled] = '\0';
}
static void listen_klog(void)
{
	/* then listen to /proc/kmsg a.k.a klogctl */
	if (klogctl(1, NULL, 0) < 0 ||	/* open the log */
	    klogctl(8, NULL, 8) < 0 ||	/* set console level */
	    klogctl(6, NULL, 0) < 0 ||  /* disable to console */
            klogctl(5, NULL,0) < 0) {       //Clear
		perror("Unable to control the kernel logging device");
		exit(1);
	}
}

void catchAlarm(int sig){//Catches the alarm signal and displays results
    //printf("Caught Signal\n");
    printResult();
    signal(sig,catchAlarm);
    if(interval > 0){
        alarm(interval);
    }
}

void
print_app_usage(void)
{

	printf("Usage: klog <interval>\n");
	printf("Options:\n");
        printf("    interval            Interval in seconds to print and clear results.\n");
        printf("\n\nKlog collects and empties the kernel buffer every second. To see results either define an interval,\nor just run it and send a SIGALRM signal to its PID.\n");
        printf("\n\nThe output format is comma-delimited: PID,DEVICE,COMMAND,READ_SECTORS,WRITE_SECTORS\n");

return;
}

int main(int argc, char **argv)
{
    if (argc == 2) {
	 interval = atoi(argv[1]);
    }
    
     
    
    else if (argc > 2) {
        fprintf(stderr, "error: unrecognized command-line options\n\n");
        print_app_usage();
        exit(EXIT_FAILURE);
    }
    
    //Register alarm handler to display results
    signal(SIGALRM,catchAlarm);
    
    if(interval > 0){
         
        //printf("Interval: %d\n",interval);   
        alarm(interval);
            
    }
    
    listen_klog();
    
    for(;;){
        
        readlines_klog();
        
        sleep(1);
        
    }

    return 0;
}

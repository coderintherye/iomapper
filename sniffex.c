/*
 * sniffex.c
 *
 * Sniffer example of TCP/IP packet capture using libpcap.
 * 
 * Version 0.1.1 (2005-07-05)
 * Copyright (c) 2005 The Tcpdump Group
 *
 * This software is intended to be used as a practical example and 
 * demonstration of the libpcap library; available at:
 * http://www.tcpdump.org/
 *
 ****************************************************************************
 *
 * This software is a modification of Tim Carstens' "sniffer.c"
 * demonstration source code, released as follows:
 * 
 * sniffer.c
 * Copyright (c) 2002 Tim Carstens
 * 2002-01-07
 * Demonstration of using libpcap
 * timcarst -at- yahoo -dot- com
 * 
 * "sniffer.c" is distributed under these terms:
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 4. The name "Tim Carstens" may not be used to endorse or promote
 *    products derived from this software without prior written permission
 *
 * THIS SOFTWARE IS PROVIDED BY THE REGENTS AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 * <end of "sniffer.c" terms>
 *
 * This software, "sniffex.c", is a derivative work of "sniffer.c" and is
 * covered by the following terms:
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Because this is a derivative work, you must comply with the "sniffer.c"
 *    terms reproduced above.
 * 2. Redistributions of source code must retain the Tcpdump Group copyright
 *    notice at the top of this source file, this list of conditions and the
 *    following disclaimer.
 * 3. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 4. The names "tcpdump" or "libpcap" may not be used to endorse or promote
 *    products derived from this software without prior written permission.
 *
 * THERE IS ABSOLUTELY NO WARRANTY FOR THIS PROGRAM.
 * BECAUSE THE PROGRAM IS LICENSED FREE OF CHARGE, THERE IS NO WARRANTY
 * FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW.  EXCEPT WHEN
 * OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES
 * PROVIDE THE PROGRAM "AS IS" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED
 * OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.  THE ENTIRE RISK AS
 * TO THE QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU.  SHOULD THE
 * PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING,
 * REPAIR OR CORRECTION.
 * 
 * IN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING
 * WILL ANY COPYRIGHT HOLDER, OR ANY OTHER PARTY WHO MAY MODIFY AND/OR
 * REDISTRIBUTE THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU FOR DAMAGES,
 * INCLUDING ANY GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING
 * OUT OF THE USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED
 * TO LOSS OF DATA OR DATA BEING RENDERED INACCURATE OR LOSSES SUSTAINED BY
 * YOU OR THIRD PARTIES OR A FAILURE OF THE PROGRAM TO OPERATE WITH ANY OTHER
 * PROGRAMS), EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGES.
 * <end of "sniffex.c" terms>
 * 
 ****************************************************************************
 *
 * Below is an excerpt from an email from Guy Harris on the tcpdump-workers
 * mail list when someone asked, "How do I get the length of the TCP
 * payload?" Guy Harris' slightly snipped response (edited by him to
 * speak of the IPv4 header length and TCP data offset without referring
 * to bitfield structure members) is reproduced below:
 * 
 * The Ethernet size is always 14 bytes.
 * 
 * <snip>...</snip>
 *
 * In fact, you *MUST* assume the Ethernet header is 14 bytes, *and*, if 
 * you're using structures, you must use structures where the members 
 * always have the same size on all platforms, because the sizes of the 
 * fields in Ethernet - and IP, and TCP, and... - headers are defined by 
 * the protocol specification, not by the way a particular platform's C 
 * compiler works.)
 *
 * The IP header size, in bytes, is the value of the IP header length,
 * as extracted from the "ip_vhl" field of "struct sniff_ip" with
 * the "IP_HL()" macro, times 4 ("times 4" because it's in units of
 * 4-byte words).  If that value is less than 20 - i.e., if the value
 * extracted with "IP_HL()" is less than 5 - you have a malformed
 * IP datagram.
 *
 * The TCP header size, in bytes, is the value of the TCP data offset,
 * as extracted from the "th_offx2" field of "struct sniff_tcp" with
 * the "TH_OFF()" macro, times 4 (for the same reason - 4-byte words).
 * If that value is less than 20 - i.e., if the value extracted with
 * "TH_OFF()" is less than 5 - you have a malformed TCP segment.
 *
 * So, to find the IP header in an Ethernet packet, look 14 bytes after 
 * the beginning of the packet data.  To find the TCP header, look 
 * "IP_HL(ip)*4" bytes after the beginning of the IP header.  To find the
 * TCP payload, look "TH_OFF(tcp)*4" bytes after the beginning of the TCP
 * header.
 * 
 * To find out how much payload there is:
 *
 * Take the IP *total* length field - "ip_len" in "struct sniff_ip" 
 * - and, first, check whether it's less than "IP_HL(ip)*4" (after
 * you've checked whether "IP_HL(ip)" is >= 5).  If it is, you have
 * a malformed IP datagram.
 *
 * Otherwise, subtract "IP_HL(ip)*4" from it; that gives you the length
 * of the TCP segment, including the TCP header.  If that's less than
 * "TH_OFF(tcp)*4" (after you've checked whether "TH_OFF(tcp)" is >= 5),
 * you have a malformed TCP segment.
 *
 * Otherwise, subtract "TH_OFF(tcp)*4" from it; that gives you the
 * length of the TCP payload.
 *
 * Note that you also need to make sure that you don't go past the end 
 * of the captured data in the packet - you might, for example, have a 
 * 15-byte Ethernet packet that claims to contain an IP datagram, but if 
 * it's 15 bytes, it has only one byte of Ethernet payload, which is too 
 * small for an IP header.  The length of the captured data is given in 
 * the "caplen" field in the "struct pcap_pkthdr"; it might be less than 
 * the length of the packet, if you're capturing with a snapshot length 
 * other than a value >= the maximum packet size.
 * <end of response>
 * 
 ****************************************************************************
 * 
 * Example compiler command-line for GCC:
 *   gcc -Wall -o sniffex sniffex.c -lpcap
 * 
 ****************************************************************************
 *
 * Code Comments
 *
 * This section contains additional information and explanations regarding
 * comments in the source code. It serves as documentaion and rationale
 * for why the code is written as it is without hindering readability, as it
 * might if it were placed along with the actual code inline. References in
 * the code appear as footnote notation (e.g. [1]).
 *
 * 1. Ethernet headers are always exactly 14 bytes, so we define this
 * explicitly with "#define". Since some compilers might pad structures to a
 * multiple of 4 bytes - some versions of GCC for ARM may do this -
 * "sizeof (struct sniff_ethernet)" isn't used.
 * 
 * 2. Check the link-layer type of the device that's being opened to make
 * sure it's Ethernet, since that's all we handle in this example. Other
 * link-layer types may have different length headers (see [1]).
 *
 * 3. This is the filter expression that tells libpcap which packets we're
 * interested in (i.e. which packets to capture). Since this source example
 * focuses on IP and TCP, we use the expression "ip", so we know we'll only
 * encounter IP packets. The capture filter syntax, along with some
 * examples, is documented in the tcpdump man page under "expression."
 * Below are a few simple examples:
 *
 * Expression			Description
 * ----------			-----------
 * ip					Capture all IP packets.
 * tcp					Capture only TCP packets.
 * tcp port 80			Capture only TCP packets with a port equal to 80.
 * ip host 10.1.2.3		Capture all IP packets to or from host 10.1.2.3.
 *
 ****************************************************************************
 *
 */

#define APP_NAME		"sniffex"
#define APP_DESC		"Sniffer example using libpcap"
#define APP_COPYRIGHT	"Copyright (c) 2005 The Tcpdump Group"
#define APP_DISCLAIMER	"THERE IS ABSOLUTELY NO WARRANTY FOR THIS PROGRAM."

#include <pcap.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>
#include <errno.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <signal.h>
//#include <netinet/if_ether.h> 
#include <net/ethernet.h>
#include <netinet/ether.h> 
#include <netinet/ip.h> 

/* default snap length (maximum bytes per packet to capture) */
#define SNAP_LEN 96

/* ethernet headers are always exactly 14 bytes [1] */
#define SIZE_ETHERNET 14

/* Ethernet addresses are 6 bytes */
#define ETHER_ADDR_LEN	6

/* Max number of Sockets to record */
#define MAX_SOCKETS	10000

/* Ethernet header */
struct sniff_ethernet {
        u_char  ether_dhost[ETHER_ADDR_LEN];    /* destination host address */
        u_char  ether_shost[ETHER_ADDR_LEN];    /* source host address */
        u_short ether_type;                     /* IP? ARP? RARP? etc */
};

/* IP header */
struct sniff_ip {
        u_char  ip_vhl;                 /* version << 4 | header length >> 2 */
        u_char  ip_tos;                 /* type of service */
        u_short ip_len;                 /* total length */
        u_short ip_id;                  /* identification */
        u_short ip_off;                 /* fragment offset field */
        #define IP_RF 0x8000            /* reserved fragment flag */
        #define IP_DF 0x4000            /* dont fragment flag */
        #define IP_MF 0x2000            /* more fragments flag */
        #define IP_OFFMASK 0x1fff       /* mask for fragmenting bits */
        u_char  ip_ttl;                 /* time to live */
        u_char  ip_p;                   /* protocol */
        u_short ip_sum;                 /* checksum */
        struct  in_addr ip_src,ip_dst;  /* source and dest address */
};
#define IP_HL(ip)               (((ip)->ip_vhl) & 0x0f)
#define IP_V(ip)                (((ip)->ip_vhl) >> 4)

/* TCP header */
typedef u_int tcp_seq;

struct sniff_tcp {
        u_short th_sport;               /* source port */
        u_short th_dport;               /* destination port */
        tcp_seq th_seq;                 /* sequence number */
        tcp_seq th_ack;                 /* acknowledgement number */
        u_char  th_offx2;               /* data offset, rsvd */
        #define TH_OFF(th)      (((th)->th_offx2 & 0xf0) >> 4)
        u_char  th_flags;
        #define TH_FIN  0x01
        #define TH_SYN  0x02
        #define TH_RST  0x04
        #define TH_PUSH 0x08
        #define TH_ACK  0x10
        #define TH_URG  0x20
        #define TH_ECE  0x40
        #define TH_CWR  0x80
        #define TH_FLAGS        (TH_FIN|TH_SYN|TH_RST|TH_ACK|TH_URG|TH_ECE|TH_CWR)
        u_short th_win;                 /* window */
        u_short th_sum;                 /* checksum */
        u_short th_urp;                 /* urgent pointer */
};

struct socket {
    struct  in_addr sip,dip;
    u_short sport;
    u_short dport;
    u_long length;
    //char  smac[ETHER_ADDR_LEN];    /* source host address */
    //char  dmac[ETHER_ADDR_LEN];    /* destination host address */
    u_char  smac[ETHER_ADDR_LEN];    /* source host address */
    u_char  dmac[ETHER_ADDR_LEN];    /* destination host address */
};

int linkhdrlen;

struct socket sockets[MAX_SOCKETS];

int socket_count = 0;

int interval = 0;                           /* interval at which to display results*/

//int inputActive = 0;

void
got_packet(u_char *args, const struct pcap_pkthdr *header, const u_char *packet);

void
print_payload(const u_char *payload, int len);

void
print_hex_ascii_line(const u_char *payload, int len, int offset);

void
print_app_banner(void);

void
print_app_usage(void);

void buildSockets(struct socket my_socket);

void printResult();

void catchAlarm(int sig);

/*
 * app name/banner
 */
void
print_app_banner(void)
{

	printf("%s - %s\n", APP_NAME, APP_DESC);
	printf("%s\n", APP_COPYRIGHT);
	printf("%s\n", APP_DISCLAIMER);
	printf("\n");

return;
}

/*
 * print help text
 */
void
print_app_usage(void)
{

	printf("Usage: %s [interface] [filter] [interval]\n", APP_NAME);
	printf("\n");
	printf("Options:\n");
	printf("    interface    Listen on <interface> for packets.\n");
        printf("    filter    TCPDUMP-like filter to apply. Currently only IPV4 and TCP supported. Default \"ip and tcp\".\n");
        printf("    interval    Interval in seconds to print and clear results.\n");
	printf("\n");
        
        
        printf("Output:\n");
	printf("    SOURCE_MAC,SOURCE_IP,SOURCE_PORT,DEST_MAC,DEST_IP,DEST_PORT,LENGTH_IN_BYTES\n");
        
        
        //printf("%s,%s,%d,",ether_ntoa((struct ether_addr*)sockets[i].smac),inet_ntoa(sockets[i].sip),sockets[i].sport);
        //printf("%s,%s,%d,%d\n",ether_ntoa((struct ether_addr*)sockets[i].dmac),inet_ntoa(sockets[i].dip),sockets[i].dport,sockets[i].length);

return;
}

/*
 * print data in rows of 16 bytes: offset   hex   ascii
 *
 * 00000   47 45 54 20 2f 20 48 54  54 50 2f 31 2e 31 0d 0a   GET / HTTP/1.1..
 */
void
print_hex_ascii_line(const u_char *payload, int len, int offset)
{

	int i;
	int gap;
	const u_char *ch;

	/* offset */
	printf("%05d   ", offset);
	
	/* hex */
	ch = payload;
	for(i = 0; i < len; i++) {
		printf("%02x ", *ch);
		ch++;
		/* print extra space after 8th byte for visual aid */
		if (i == 7)
			printf(" ");
	}
	/* print space to handle line less than 8 bytes */
	if (len < 8)
		printf(" ");
	
	/* fill hex gap with spaces if not full line */
	if (len < 16) {
		gap = 16 - len;
		for (i = 0; i < gap; i++) {
			printf("   ");
		}
	}
	printf("   ");
	
	/* ascii (if printable) */
	ch = payload;
	for(i = 0; i < len; i++) {
		if (isprint(*ch))
			printf("%c", *ch);
		else
			printf(".");
		ch++;
	}

	printf("\n");

return;
}

/*
 * print packet payload data (avoid printing binary data)
 */
void
print_payload(const u_char *payload, int len)
{

	int len_rem = len;
	int line_width = 16;			/* number of bytes per line */
	int line_len;
	int offset = 0;					/* zero-based offset counter */
	const u_char *ch = payload;

	if (len <= 0)
		return;

	/* data fits on one line */
	if (len <= line_width) {
		print_hex_ascii_line(ch, len, offset);
		return;
	}

	/* data spans multiple lines */
	for ( ;; ) {
		/* compute current line length */
		line_len = line_width % len_rem;
		/* print line */
		print_hex_ascii_line(ch, line_len, offset);
		/* compute total remaining */
		len_rem = len_rem - line_len;
		/* shift pointer to remaining bytes to print */
		ch = ch + line_len;
		/* add offset */
		offset = offset + line_width;
		/* check if we have line width chars or less */
		if (len_rem <= line_width) {
			/* print last line and get out */
			print_hex_ascii_line(ch, len_rem, offset);
			break;
		}
	}

return;
}

/*
 * dissect/print packet
 */
void
got_packet(u_char *args, const struct pcap_pkthdr *header, const u_char *packet)
{

	static int count = 1;                   /* packet counter */
	
	/* declare pointers to packet headers */
	const struct sniff_ethernet *ethernet;  /* The ethernet header [1] */
	const struct sniff_ip *ip;              /* The IP header */
	const struct sniff_tcp *tcp;            /* The TCP header */
	const char *payload;                    /* Packet payload */
        
        //struct ether_header *eptr;  /* net/ethernet.h */
        
	int size_ip;
	int size_tcp;
	int size_payload;
        
        u_int length = header->len;
        
        int i;
        
        //int mac_addr_len = ETHER_ADDR_LEN;
        
        struct socket my_socket;
        
	count++;
	
	/* define ethernet header */
	ethernet = (struct sniff_ethernet*)(packet);
        
        //eptr = (struct ether_header*)(packet);
        
        //fprintf(stdout,"ETH: ");
        //fprintf(stdout,"%s "
        //    ,ether_ntoa((struct ether_addr*)ethernet->ether_shost));
        //fprintf(stdout,"%s "
        //    ,ether_ntoa((struct ether_addr*)ethernet->ether_dhost));
	
	/* define/compute ip header offset */
	ip = (struct sniff_ip*)(packet + SIZE_ETHERNET);
	size_ip = IP_HL(ip)*4;
	if (size_ip < 20) {
		//printf("   * Invalid IP header length: %u bytes\n", size_ip);
		return;
	}

	/* print source and destination IP addresses */
	//printf("       From: %s\n", inet_ntoa(ip->ip_src));
	//printf("         To: %s\n", inet_ntoa(ip->ip_dst));
        	
	/* determine protocol */	
	switch(ip->ip_p) {
		case IPPROTO_TCP:
			//printf("   Protocol: TCP\n");
			break;
		case IPPROTO_UDP:
			//printf("   Protocol: UDP\n");
			return;
		case IPPROTO_ICMP:
			//printf("   Protocol: ICMP\n");
			return;
		case IPPROTO_IP:
			//printf("   Protocol: IP\n");
			return;
		default:
			//printf("   Protocol: unknown\n");
			return;
	}
	
	/*
	 *  OK, this packet is TCP.
	 */
	
	/* define/compute tcp header offset */
	tcp = (struct sniff_tcp*)(packet + SIZE_ETHERNET + size_ip);
	size_tcp = TH_OFF(tcp)*4;
	if (size_tcp < 20) {
		//printf("   * Invalid TCP header length: %u bytes\n", size_tcp);
		return;
	}
	
	//printf("   Src port: %d\n", ntohs(tcp->th_sport));
	//printf("   Dst port: %d\n", ntohs(tcp->th_dport));
	//printf("   Total Length: %d\n", length);
        
        my_socket.sport = ntohs(tcp->th_sport);
        my_socket.dport = ntohs(tcp->th_dport);
        //sip = inet_ntoa(ip->ip_src);
        //dip = inet_ntoa(ip->ip_dst);
        
        my_socket.sip = ip->ip_src;
        my_socket.dip = ip->ip_dst;
        
        my_socket.length = length;
        
        
        //printf("Ethernet length %d\n",mac_addr_len);
        //printf("Ethernet header SHOST ");
        
        for(i = 0;i < ETHER_ADDR_LEN; i++){
            my_socket.smac[i] = ethernet->ether_shost[i];
            my_socket.dmac[i] = ethernet->ether_dhost[i];
            //printf("Ethernet header part %d \n",ethernet->ether_shost[i]);
        }
        
        
        

        //struct sniff_ethernet {
        //    u_char  ether_dhost[ETHER_ADDR_LEN];    /* destination host address */
        //    u_char  ether_shost[ETHER_ADDR_LEN];    /* source host address */
        //    u_short ether_type;                     /* IP? ARP? RARP? etc */
        //};
        


        //printf("Trying to get MACs\n");
        //printf("Source MAC: %s\n",ether_ntoa((struct ether_addr*)ethernet->ether_shost));
        //printf("Dest MAC: %s\n",ether_ntoa((struct ether_addr*)ethernet->ether_dhost));
        
        //printf("Trying to get MACs\n");
        //printf("Source MAC: %d\n",ethernet->ether_shost);
        //printf("Dest MAC: %d\n",ethernet->ether_dhost);
        
        
        //strcpy(my_socket.smac,ethernet->ether_shost);
        //strcpy(my_socket.dmac,ethernet->ether_dhost);
        
        //printf("Result: Source %s, Source Port %d, Dest %s, Dest Port %d, Length %d\n",sip,sport,dip,dport,length);
        
        //printf("Result: Source %s, Source Port %d, Dest %s, Dest Port %d, Length %d\n",inet_ntoa(ip->ip_src),sport,inet_ntoa(ip->ip_dst),dport,length);
        
        //printf("Result: Source %s, Source Port %d, ",sip,sport);
       // printf("Dest %s, Dest Port %d, Length %d\n",dip,dport,length);
        
        //printf("Raw Result: Source %d, Dest %d\n",sip,dip);
        
       
        
	/* define/compute tcp payload (segment) offset */
	payload = (u_char *)(packet + SIZE_ETHERNET + size_ip + size_tcp);
	
	/* compute tcp payload (segment) size */
	size_payload = ntohs(ip->ip_len) - (size_ip + size_tcp);
	
        buildSockets(my_socket);
        
        //if(inputActive == 0){
        //    getInput();
        //}
        
	/*
	 * Print payload data; it might be binary, so don't just
	 * treat it as a string.
	 */
	if (size_payload > 0) {
		//printf("   Payload (%d bytes):\n", size_payload);
		//print_payload(payload, size_payload);
	}

return;
}

void catchAlarm(int sig){//Catches the alarm signal and displays results
    //printf("Caught Signal\n");
    printResult();
    signal(sig,catchAlarm);
    if(interval > 0){
        alarm(interval);
    }
}
//void getInput(){
//    int c;
//    inputActive = 1;
//    printf("waiting for input");
//    c = getchar();
//    printResult();
//    getInput();
//}

void printResult(){
    int i = 0;
    printf("###BEGIN###\n");
    for(i = 0; i < socket_count; i++) {
        //printf("Result: Source MAC %s, Source %s, Source Port %d, ",ether_ntoa((struct ether_addr*)sockets[i].smac),inet_ntoa(sockets[i].sip),sockets[i].sport);
        //printf("Dest MAC %s, Dest %s, Dest Port %d, Length %d\n",ether_ntoa((struct ether_addr*)sockets[i].dmac),inet_ntoa(sockets[i].dip),sockets[i].dport,sockets[i].length);
        
        printf("%s,%s,%d,",ether_ntoa((struct ether_addr*)sockets[i].smac),inet_ntoa(sockets[i].sip),sockets[i].sport);
        printf("%s,%s,%d,%d\n",ether_ntoa((struct ether_addr*)sockets[i].dmac),inet_ntoa(sockets[i].dip),sockets[i].dport,sockets[i].length);
        //clear results:
        //sockets[i].sip.s_addr = NULL;
        //sockets[i].dip.s_addr = NULL;
        //sockets[i].sport = NULL;
        //sockets[i].dport = NULL;
        //sockets[i].length = NULL;
    }
    //clear results:
    socket_count=0;
    printf("###END###\n");
    fflush(stdout);
}

void buildSockets(struct socket my_socket){
    
    int i;
    int z;
    //printf("My Function: Source %d, Dest %d\n",my_socket.sip,my_socket.dip);
    //printf("Result: Source %s, Source Port %d, ",inet_ntoa(my_socket.sip),my_socket.sport);
    //printf("Dest %s, Dest Port %d, Length %d\n",inet_ntoa(my_socket.dip),my_socket.dport,my_socket.length);
    
    //printf("My Socket MAC: %d\n",my_socket.smac);
    
    if(socket_count >= MAX_SOCKETS){
        printf("%d sockets reached, clearing results...\n",MAX_SOCKETS);
        
        printResult();
        //for(i = 0; i < socket_count; i++) {
        //    printf("Result: Source %s, Source Port %d, ",inet_ntoa(sockets[i].sip),sockets[i].sport);
        //    printf("Dest %s, Dest Port %d, Length %d\n",inet_ntoa(sockets[i].dip),sockets[i].dport,sockets[i].length);
        //}
        
        
        //exit(0);
    }
    
    //Create first socket:
    if(socket_count == 0){
        //printf("socket count 0\n");
        //printf("max sockets %d\n",MAX_SOCKETS);
        sockets[0].sip = my_socket.sip;
        sockets[0].dip = my_socket.dip;
        sockets[0].sport = my_socket.sport;
        sockets[0].dport = my_socket.dport;
        sockets[0].length = my_socket.length;
        for(z = 0;z < ETHER_ADDR_LEN; z++){
            sockets[0].smac[z] = my_socket.smac[z];
            sockets[0].dmac[z] = my_socket.dmac[z];
            //printf("Ethernet header part %d \n",ethernet->ether_shost[i]);
        }
        socket_count++;
        return;
    }
    
    for(i = 0; i <= socket_count; i++) {//If this socket already being recorded:
        
        if(sockets[i].sip.s_addr == my_socket.sip.s_addr &&
           sockets[i].dip.s_addr == my_socket.dip.s_addr &&
           sockets[i].sport == my_socket.sport &&
           sockets[i].dport == my_socket.dport){//} &&
           //sockets[i].smac == my_socket.smac &&
           //sockets[i].dmac == my_socket.dmac){
            
                sockets[i].length = sockets[i].length + my_socket.length;
                //printf("socket found, source %s\n",inet_ntoa(sockets[i].sip));
                return;
            
        }
    }
    
    //New Socket
   
    sockets[socket_count].sip = my_socket.sip;
    sockets[socket_count].dip = my_socket.dip;
    sockets[socket_count].sport = my_socket.sport;
    sockets[socket_count].dport = my_socket.dport;
    sockets[socket_count].length = my_socket.length;
    for(z = 0;z < ETHER_ADDR_LEN; z++){
        sockets[socket_count].smac[z] = my_socket.smac[z];
        sockets[socket_count].dmac[z] = my_socket.dmac[z];
        //printf("Ethernet header part %d \n",ethernet->ether_shost[i]);
    }
    //printf("New socket, Source %s:%s:%d, ",ether_ntoa((struct ether_addr*)sockets[socket_count].smac),inet_ntoa(sockets[socket_count].sip),sockets[socket_count].sport);
    //printf("Dest %s:%s:%d\n",ether_ntoa((struct ether_addr*)sockets[socket_count].dmac),inet_ntoa(sockets[socket_count].dip),sockets[socket_count].dport);
    socket_count++;
    return;
    
    //ether_ntoa(sockets[socket_count].smac)
    //ether_ntoa((struct ether_addr*)sockets[socket_count].smac)
}

int main(int argc, char **argv)
{

	char *dev = NULL;			/* capture device name */
	char errbuf[PCAP_ERRBUF_SIZE];		/* error buffer */
	pcap_t *handle;				/* packet capture handle */

	char default_filter_exp[] = "ip and tcp";	/* filter expression [3] */
        char *filter_exp = NULL;
	struct bpf_program fp;			/* compiled filter program (expression) */
	bpf_u_int32 mask;			/* subnet mask */
	bpf_u_int32 net;			/* ip */
	int num_packets = -1;			/* number of packets to capture */
        int i;

	//print_app_banner();

	/* check for capture device name on command-line */
        //for (i=1; i< argc; i++) {
        //    printf("arg%d=%s\n", i, argv[i]);
        //}
        
	if (argc == 2) {
	    dev = argv[1];
            //strcpy(*filter_exp,default_filter_exp);
            char filter_exp[] = "ip and tcp";
	}
        else if (argc == 3) {
	    dev = argv[1];
            filter_exp = argv[2];
	}
        else if (argc == 4) {
	    
            dev = argv[1];
            filter_exp = argv[2];
            interval = atoi(argv[3]);
	}
	else if (argc > 4) {
		fprintf(stderr, "error: unrecognized command-line options; too many\n\n");
                for (i = 0;i<argc;i++){
                //fprintf(stderr,dev);
                //fprintf(stderr,filter_exp);
                fprintf(stderr,"%s\n",argv[i]);
                //fprintf(stderr,'\n');
                }
		print_app_usage();
		exit(EXIT_FAILURE);
	}
	else {
		///* find a capture device if not specified on command-line */
		//dev = pcap_lookupdev(errbuf);
		//if (dev == NULL) {
		//	fprintf(stderr, "Couldn't find default device: %s\n",
		//	    errbuf);
		//	exit(EXIT_FAILURE);
		//}
                fprintf(stderr, "error: unrecognized command-line options\n\n");
                for (i = 0;i<argc;i++){
                //fprintf(stderr,dev);
                //fprintf(stderr,filter_exp);
                fprintf(stderr,"%s\n",argv[i]);
                //fprintf(stderr,'\n');
                }
		print_app_usage();
		exit(EXIT_FAILURE);
	}
	
	/* get network number and mask associated with capture device */
	if (pcap_lookupnet(dev, &net, &mask, errbuf) == -1) {
		fprintf(stderr, "Couldn't get netmask for device %s: %s\n",
		    dev, errbuf);
		net = 0;
		mask = 0;
	}

	/* print capture info */
	//printf("Device: %s\n", dev);
	//printf("Number of packets: %d\n", num_packets);
	//printf("Filter expression: %s\n", filter_exp);
        //printf("Interval: %d\n",interval);

	/* open capture device */
	handle = pcap_open_live(dev, SNAP_LEN, 0, 1000, errbuf);
	if (handle == NULL) {
		fprintf(stderr, "Couldn't open device %s: %s\n", dev, errbuf);
		exit(EXIT_FAILURE);
	}
        
        
        int linktype;
        
 
        // Determine the datalink layer type.
        if ((linktype = pcap_datalink(handle)) < 0)
        {
            printf("pcap_datalink(): %s\n", pcap_geterr(handle));
            return 1;
        }
     
        // Set the datalink layer header size.
        switch (linktype)
        {
        case DLT_NULL:
            linkhdrlen = 4;
            break;
     
        case DLT_EN10MB:
            linkhdrlen = 14;
            break;
     
        case DLT_SLIP:
        case DLT_PPP:
            linkhdrlen = 24;
            //#define SIZE_ETHERNET 24
            break;
        case 113://DLT_LINUX_SLL - when capturing on ANY. Don't use since there's no DEST MAC in the header
            linkhdrlen = 16;
            //#define SIZE_ETHERNET 16
            break;
     
        default:
            printf("Unsupported datalink (%d)\n", linktype);
            return 1;
        }
        
        
	/* make sure we're capturing on an Ethernet device [2] */
	if (pcap_datalink(handle) != DLT_EN10MB) {
		fprintf(stderr, "%s is not an Ethernet\n", dev);
		exit(EXIT_FAILURE);
	}

	/* compile the filter expression */
	if (pcap_compile(handle, &fp, filter_exp, 0, net) == -1) {
		fprintf(stderr, "Couldn't parse filter %s: %s\n",
		    filter_exp, pcap_geterr(handle));
		exit(EXIT_FAILURE);
	}

	/* apply the compiled filter */
	if (pcap_setfilter(handle, &fp) == -1) {
		fprintf(stderr, "Couldn't install filter %s: %s\n",
		    filter_exp, pcap_geterr(handle));
		exit(EXIT_FAILURE);
	}
        
        //Register alarm handler to display results
        signal(SIGALRM,catchAlarm);
        
        if(interval > 0){
            alarm(interval);
        }

	/* now we can set our callback function */
	pcap_loop(handle, num_packets, got_packet, NULL);
        
        

	/* cleanup */
	pcap_freecode(&fp);
	pcap_close(handle);

	printf("\nCapture complete.\n");

return 0;
}
